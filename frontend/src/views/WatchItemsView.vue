<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import Select from 'primevue/select';
import Tag from 'primevue/tag';
import { useToast } from 'primevue/usetoast';

import AppLayout from '../layouts/AppLayout.vue';
import { errorFr } from '../i18n/errors';
import { labelFr, optionsFr } from '../i18n/labels';
import { useAuthStore } from '../stores/auth';
import { searchWatchItems, type SearchParams } from '../services/search.service';
import { addFavorite, getFavorites, removeFavorite } from '../services/favorites.service';
import { createSavedView, getSavedViews } from '../services/saved-views.service';
import type { WatchItem } from '../services/watch-items.service';

interface SavedView {
  id: number;
  name: string;
  filters: Partial<SearchParams>;
}

interface WatchItemSearchResponse {
  items: WatchItem[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const toast = useToast();
const items = ref<WatchItem[]>([]);
const total = ref(0);
const favorites = ref<number[]>([]);
const favoriteBusy = ref<number[]>([]);
const savedViews = ref<SavedView[]>([]);
const saveDialog = ref(false);
const viewName = ref('');
const loading = ref(false);
const extrasLoading = ref(false);
const error = ref('');
let searchTimer: ReturnType<typeof setTimeout> | undefined;
let latestRequest = 0;

const filters = ref({
  q: '',
  status: '',
  criticality: '',
  watchType: '',
  page: 1,
  limit: 20,
  sortBy: 'publishedAt',
  sortOrder: 'DESC' as 'ASC' | 'DESC',
  favoritesOnly: route.query.favorites === '1',
});

const statusOptions = optionsFr(['NOUVEAU', 'A_QUALIFIER', 'VALIDE', 'PUBLIE', 'ARCHIVE', 'REJETE']);
const criticalityOptions = optionsFr(['FAIBLE', 'MOYENNE', 'ELEVEE', 'CRITIQUE']);
const watchTypeOptions = optionsFr([
  'SCIENTIFIQUE',
  'REGLEMENTAIRE',
  'ACCREDITATION',
  'NORMATIF',
  'ENVIRONNEMENT',
  'AUTRE',
]);
const sortOptions = [
  { label: 'Date de publication', value: 'publishedAt' },
  { label: 'Date de collecte', value: 'collectedAt' },
  { label: 'Pertinence', value: 'relevance' },
  { label: 'Criticité', value: 'criticality' },
  { label: 'Titre', value: 'title' },
];
const sortOrderOptions = [
  { label: 'Décroissant', value: 'DESC' },
  { label: 'Croissant', value: 'ASC' },
];

const canQualify = computed(() => {
  const roles = auth.user?.roles ?? [];
  return (
    roles.includes('ADMIN') ||
    roles.includes('RESPONSABLE_VEILLE') ||
    roles.includes('OPERATEUR_VEILLE')
  );
});
const hasInternalWatchAccess = computed(() =>
  ['ADMIN', 'RESPONSABLE_VEILLE', 'REFERENT_LABORATOIRE', 'OPERATEUR_VEILLE']
    .some((role) => (auth.user?.roles ?? []).includes(role)),
);
const visibleStatusOptions = computed(() =>
  hasInternalWatchAccess.value ? statusOptions : optionsFr(['PUBLIE']),
);

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

function formatDate(value: string | null) {
  if (!value) return 'Non renseignée';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Non renseignée' : dateFormatter.format(date);
}

function errorMessage(cause: unknown, fallback: string) {
  if (typeof cause === 'object' && cause !== null && 'response' in cause) {
    const response = (cause as { response?: { data?: { message?: string | string[] } } }).response;
    const message = response?.data?.message;
    if (Array.isArray(message)) return message.map(errorFr).join(' ');
    if (typeof message === 'string') return errorFr(message);
  }
  return fallback;
}

async function load() {
  const requestId = ++latestRequest;
  loading.value = true;
  error.value = '';
  try {
    const response = await searchWatchItems(filters.value);
    if (requestId !== latestRequest) return;
    const result = response.data as WatchItemSearchResponse;
    items.value = result.items;
    total.value = result.total;
  } catch (cause) {
    if (requestId !== latestRequest) return;
    error.value = errorMessage(cause, 'Impossible de charger les éléments de veille.');
  } finally {
    if (requestId === latestRequest) loading.value = false;
  }
}

function scheduleSearch() {
  filters.value.page = 1;
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    void load();
  }, 350);
}

async function loadExtras() {
  extrasLoading.value = true;
  try {
    const [favoritesResponse, viewsResponse] = await Promise.all([getFavorites(), getSavedViews()]);
    favorites.value = favoritesResponse.data
      .map((favorite: { watchItem?: { id?: number } }) => favorite.watchItem?.id)
      .filter((id: number | undefined): id is number => typeof id === 'number');
    window.dispatchEvent(new CustomEvent('favorites-changed', { detail: favorites.value.length }));
    savedViews.value = viewsResponse.data;
  } catch (cause) {
    error.value = errorMessage(cause, 'Impossible de charger les favoris et les vues enregistrées.');
  } finally {
    extrasLoading.value = false;
  }
}

async function toggleFavorite(id: number) {
  if (favoriteBusy.value.includes(id)) return;
  favoriteBusy.value = [...favoriteBusy.value, id];
  const wasFavorite = favorites.value.includes(id);
  try {
    if (wasFavorite) await removeFavorite(id);
    else await addFavorite(id);
    await loadExtras();
    if (filters.value.favoritesOnly && wasFavorite) await load();
    toast.add({
      severity: 'success',
      summary: wasFavorite ? 'Favori retiré' : 'Favori ajouté',
      detail: wasFavorite
        ? 'La veille a été retirée de vos favoris.'
        : 'La veille a été ajoutée à vos favoris.',
      life: 3000,
    });
  } catch (cause) {
    toast.add({
      severity: 'error',
      summary: 'Modification impossible',
      detail: errorMessage(cause, 'Impossible de modifier ce favori.'),
      life: 4000,
    });
  } finally {
    favoriteBusy.value = favoriteBusy.value.filter((itemId) => itemId !== id);
  }
}

async function saveView() {
  const name = viewName.value.trim();
  if (!name) return;
  try {
    await createSavedView({ name, filters: { ...filters.value } });
    saveDialog.value = false;
    viewName.value = '';
    await loadExtras();
    toast.add({
      severity: 'success',
      summary: 'Vue enregistrée',
      detail: `La vue « ${name} » est disponible.`,
      life: 3000,
    });
  } catch (cause) {
    toast.add({
      severity: 'error',
      summary: 'Enregistrement impossible',
      detail: errorMessage(cause, 'Impossible d’enregistrer cette vue.'),
      life: 4000,
    });
  }
}

function applyView(view: SavedView) {
  filters.value = { ...filters.value, ...view.filters, page: 1 };
}

function search() {
  filters.value.page = 1;
  if (searchTimer) clearTimeout(searchTimer);
  void load();
}

function resetFilters() {
  filters.value = {
    q: '',
    status: '',
    criticality: '',
    watchType: '',
    page: 1,
    limit: 20,
    sortBy: 'publishedAt',
    sortOrder: 'DESC',
    favoritesOnly: false,
  };
}

function changePage(event: { page: number; rows: number }) {
  filters.value.page = event.page + 1;
  filters.value.limit = event.rows;
  void load();
}

onMounted(async () => {
  await Promise.allSettled([load(), loadExtras()]);
});

watch(
  () => [
    filters.value.q,
    filters.value.status,
    filters.value.criticality,
    filters.value.watchType,
    filters.value.sortBy,
    filters.value.sortOrder,
    filters.value.favoritesOnly,
  ],
  scheduleSearch,
);

watch(
  () => route.query.favorites,
  (value) => {
    filters.value.favoritesOnly = value === '1';
  },
);

onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer);
});
</script>

<template>
  <AppLayout>
    <div class="space-y-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-2xl font-bold text-slate-900">Éléments de veille</h2>
          <p class="text-slate-700">Recherche, consultation et suivi des informations collectées.</p>
        </div>
        <Button label="Enregistrer la vue" icon="pi pi-bookmark" @click="saveDialog = true" />
      </div>

      <Message v-if="error" severity="error" closable @close="error = ''">{{ error }}</Message>

      <section class="rounded-xl bg-white p-5 shadow-sm">
        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <InputText
            v-model="filters.q"
            class="w-full"
            placeholder="Rechercher un titre ou un résumé..."
            @keyup.enter="search"
          />
          <Select v-model="filters.status" :options="visibleStatusOptions" option-label="label" option-value="value"
            show-clear placeholder="Statut" class="w-full" />
          <Select v-model="filters.criticality" :options="criticalityOptions" option-label="label"
            option-value="value" show-clear placeholder="Criticité" class="w-full" />
          <Select v-model="filters.watchType" :options="watchTypeOptions" option-label="label" option-value="value"
            show-clear placeholder="Type de veille" class="w-full" />
          <Select v-model="filters.sortBy" :options="sortOptions" option-label="label" option-value="value"
            placeholder="Trier par" class="w-full" />
          <Select v-model="filters.sortOrder" :options="sortOrderOptions" option-label="label" option-value="value"
            placeholder="Ordre" class="w-full" />
          <Button label="Rechercher" icon="pi pi-search" :loading="loading" @click="search" />
          <Button label="Réinitialiser" icon="pi pi-filter-slash" severity="secondary" @click="resetFilters" />
        </div>
      </section>

      <section v-if="savedViews.length || extrasLoading" class="rounded-xl bg-white p-4 shadow-sm">
        <p class="mb-3 text-sm font-semibold text-slate-700">Vues enregistrées</p>
        <div class="flex flex-wrap gap-2">
          <Button v-for="view in savedViews" :key="view.id" :label="view.name" icon="pi pi-bookmark"
            severity="secondary" size="small" @click="applyView(view)" />
          <span v-if="extrasLoading" class="text-sm text-slate-500">Chargement...</span>
        </div>
      </section>

      <div class="rounded-xl bg-white p-5 shadow-sm">
        <DataTable :value="items" :loading="loading" data-key="id" lazy paginator
          :first="(filters.page - 1) * filters.limit" :rows="filters.limit"
          :rows-per-page-options="[10, 20, 50]" :total-records="total" @page="changePage">
          <template #empty>Aucun élément ne correspond aux critères sélectionnés.</template>
          <Column field="title" header="Titre" />
          <Column header="Source"><template #body="{ data }">{{ data.source?.name ?? 'Non renseignée' }}</template></Column>
          <Column header="Type"><template #body="{ data }">{{ labelFr(data.watchType) }}</template></Column>
          <Column header="Collecté le"><template #body="{ data }">{{ formatDate(data.collectedAt) }}</template></Column>
          <Column header="Criticité"><template #body="{ data }">{{ labelFr(data.criticality) }}</template></Column>
          <Column header="Statut"><template #body="{ data }"><Tag :value="labelFr(data.status)" /></template></Column>
          <Column header="Actions">
            <template #body="{ data }">
              <div class="flex flex-wrap gap-2">
                <Button label="Voir" size="small" severity="secondary"
                  @click="router.push(`/watch-items/${data.id}`)" />
                <Button v-if="canQualify && ['NOUVEAU', 'A_QUALIFIER'].includes(data.status)" label="Qualifier"
                  size="small" @click="router.push(`/watch-items/${data.id}/qualification`)" />
                <Button :icon="favorites.includes(data.id) ? 'pi pi-star-fill' : 'pi pi-star'"
                  :aria-label="favorites.includes(data.id) ? 'Retirer des favoris' : 'Ajouter aux favoris'"
                  :title="favorites.includes(data.id) ? 'Retirer des favoris' : 'Ajouter aux favoris'"
                  severity="secondary" size="small" :loading="favoriteBusy.includes(data.id)"
                  @click="toggleFavorite(data.id)" />
              </div>
            </template>
          </Column>
        </DataTable>
      </div>

      <Dialog v-model:visible="saveDialog" modal header="Enregistrer la vue" class="w-full max-w-md">
        <form class="space-y-4" @submit.prevent="saveView">
          <div>
            <label for="saved-view-name" class="mb-2 block font-medium">Nom de la vue</label>
            <InputText id="saved-view-name" v-model="viewName" class="w-full"
              placeholder="Exemple : Veilles critiques" maxlength="150" autofocus />
          </div>
          <div class="flex justify-end gap-2">
            <Button type="button" label="Annuler" severity="secondary" @click="saveDialog = false" />
            <Button type="submit" label="Enregistrer" :disabled="!viewName.trim()" />
          </div>
        </form>
      </Dialog>
    </div>
  </AppLayout>
</template>
