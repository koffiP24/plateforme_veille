<script setup lang="ts">
import Checkbox
  from 'primevue/checkbox';

import PlusIcon
  from '@primeicons/vue/plus';

import {
  createSource,
  createConnector,
} from '../services/sources.service';

import {
  buildConnectorConfig,
} from '../services/connector-config';

import {
  defaultSourceQuery,
} from '../utils/source-targeting';

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
import ArrowRightIcon from '@primeicons/vue/arrow-right';
import BookmarkIcon from '@primeicons/vue/bookmark';
import CheckCircleIcon from '@primeicons/vue/check-circle';
import ExternalLinkIcon from '@primeicons/vue/external-link';
import FilterSlashIcon from '@primeicons/vue/filter-slash';
import StarIcon from '@primeicons/vue/star';
import StarFillIcon from '@primeicons/vue/star-fill';
import TrashIcon from '@primeicons/vue/trash';
import AppLayout from '../layouts/AppLayout.vue';
import { errorFr } from '../i18n/errors';
import { labelFr, optionsFr } from '../i18n/labels';
import { useAuthStore } from '../stores/auth';
import { searchWatchItems, type SearchParams } from '../services/search.service';
import { addFavorite, getFavorites, removeFavorite } from '../services/favorites.service';
import { createSavedView, deleteSavedView, getSavedViews } from '../services/saved-views.service';
import type { WatchItem } from '../services/watch-items.service';
import { statusSeverity } from '../utils/status-severity';

const sourceDialogVisible =
  ref(false);

const sourceSubmitting =
  ref(false);

const sourceError =
  ref('');

const createWithConnector =
  ref(true);

const targetQuery =
  ref('');

const CROSSREF_API_URL =
  'https://api.crossref.org';

const sourceCategoryOptions = [
  'SCIENTIFIQUE',
  'REGLEMENTAIRE',
  'ACCREDITATION',
  'NORMATIF',
  'ENVIRONNEMENT',
  'AUTRE',
];

const sourceCreationTypeOptions = [
  'API',
  'RSS',
  'ATOM',
  'IMPORT_MANUEL',
];

const sourceForm = ref({
  name: '',
  organization: '',
  country: '',
  category: '',
  sourceType: '',
  baseUrl: '',
  frequency: '',
  active: true,
});



watch(
  () => sourceForm.value.category,
  (category) => {
    targetQuery.value = defaultSourceQuery(category);
  },
);

watch(
  () => sourceForm.value.sourceType,
  (sourceType, previousType) => {
    if (sourceType === 'API') {
      sourceForm.value.baseUrl = CROSSREF_API_URL;
    } else if (sourceType === 'IMPORT_MANUEL') {
      sourceForm.value.baseUrl = '';
      sourceForm.value.frequency = '';
      targetQuery.value = '';
    } else if (
      previousType === 'API' &&
      sourceForm.value.baseUrl === CROSSREF_API_URL
    ) {
      sourceForm.value.baseUrl = '';
    }
  },
);

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
const sourceRoles =
  computed(
    () => auth.user?.roles ?? [],
  );

const canCreateSource =
  computed(() =>
    sourceRoles.value.includes(
      'ADMIN',
    ) ||
    sourceRoles.value.includes(
      'OPERATEUR_VEILLE',
    ),
  );

async function submitSource() {
  if (!canCreateSource.value || sourceSubmitting.value) {
    return;
  }

  sourceSubmitting.value = true;
  sourceError.value = '';

  try {
    const config =
      auth.isAdmin &&
      createWithConnector.value &&
      sourceForm.value.sourceType !== 'IMPORT_MANUEL'
        ? buildConnectorConfig(
            sourceForm.value.sourceType,
            sourceForm.value.baseUrl,
            targetQuery.value,
          )
        : null;

    const response = await createSource({
      ...sourceForm.value,
      baseUrl: sourceForm.value.baseUrl.trim() || undefined,
    });

    if (config) {
      await createConnector(
        response.data.id,
        response.data.sourceType,
        config,
      );
    }

    sourceDialogVisible.value = false;
    sourceForm.value = {
      name: '',
      organization: '',
      country: '',
      category: '',
      sourceType: '',
      baseUrl: '',
      frequency: '',
      active: true,
    };
    targetQuery.value = '';

    toast.add({
      severity: 'success',
      summary: 'Source créée',
      detail: 'La source a été enregistrée.',
      life: 4000,
    });
  } catch (cause: any) {
    sourceError.value =
      cause.response?.data?.message ?? 'Création impossible.';
  } finally {
    sourceSubmitting.value = false;
  }
}

const favoritesMode = computed(() => route.query.favorites === '1');
const pageTitle = computed(() => favoritesMode.value ? 'Mes favoris' : 'Éléments de veille');
const pageSubtitle = computed(() => favoritesMode.value
  ? 'Consultation et recherche dans vos veilles favorites.'
  : 'Recherche, consultation et suivi des informations collectées.');
const items = ref<WatchItem[]>([]);
const total = ref(0);
const favorites = ref<number[]>([]);
const favoriteBusy = ref<number[]>([]);
const savedViews = ref<SavedView[]>([]);
const saveDialog = ref(false);
const viewName = ref('');
const viewToDelete = ref<SavedView | null>(null);
const deletingView = ref(false);
const loading = ref(false);
const extrasLoading = ref(false);
const error = ref('');
let searchTimer: ReturnType<typeof setTimeout> | undefined;
let latestRequest = 0;
let searchController: AbortController | undefined;

const filters = ref({
  q: '',
  status: '',
  criticality: '',
  watchType: '',
  sourceType: '',
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
const sourceTypeOptions =
  optionsFr([
    'API',
    'RSS',
    'ATOM',
    'IMPORT_MANUEL',
  ]);
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

function prioritySeverity(
  value: string | null,
) {
  switch (value) {
    case 'CRITIQUE':
      return 'danger';

    case 'ELEVEE':
      return 'warn';

    case 'MOYENNE':
      return 'info';

    case 'FAIBLE':
      return 'secondary';

    default:
      return 'secondary';
  }
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
  searchController?.abort();
  searchController = new AbortController();
  loading.value = true;
  error.value = '';
  try {
    const response = await searchWatchItems(filters.value, searchController.signal);
    if (requestId !== latestRequest) return;
    const result = response.data as WatchItemSearchResponse;
    items.value = result.items;
    total.value = result.total;
  } catch (cause) {
    if (requestId !== latestRequest) return;
    if ((cause as { code?: string })?.code === 'ERR_CANCELED') return;
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
  filters.value = {
    ...filters.value,
    ...view.filters,
    page: 1,
    favoritesOnly: favoritesMode.value ? true : Boolean(view.filters.favoritesOnly),
  };
}

async function removeSavedView() {
  if (!viewToDelete.value || deletingView.value) return;
  const selectedView = viewToDelete.value;
  deletingView.value = true;
  try {
    await deleteSavedView(selectedView.id);
    await loadExtras();
    viewToDelete.value = null;
    toast.add({
      severity: 'success',
      summary: 'Vue supprimée',
      detail: `La vue « ${selectedView.name} » a été supprimée.`,
      life: 3500,
    });
  } catch (cause) {
    toast.add({
      severity: 'error',
      summary: 'Suppression impossible',
      detail: errorMessage(cause, 'Impossible de supprimer cette vue enregistrée.'),
      life: 4500,
    });
  } finally {
    deletingView.value = false;
  }
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
    sourceType: '',
    page: 1,
    limit: 20,
    sortBy: 'publishedAt',
    sortOrder: 'DESC',
    favoritesOnly: favoritesMode.value,
  };
}

function changePage(event: { page: number; rows: number }) {
  filters.value.page = event.page + 1;
  filters.value.limit = event.rows;
  void load();
}

function changeSort(event: {
  sortField?: string | ((item: WatchItem) => string);
  sortOrder?: 1 | 0 | -1 | null;
}) {
  if (typeof event.sortField !== 'string' || !event.sortOrder) return;
  filters.value.sortBy = event.sortField;
  filters.value.sortOrder = event.sortOrder === 1 ? 'ASC' : 'DESC';
  filters.value.page = 1;
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
    filters.value.sourceType,
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
    filters.value.page = 1;
  },
);

onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer);
  searchController?.abort();
});
</script>

<template>
  <AppLayout>
    <div class="space-y-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-2xl font-bold text-slate-900">{{ pageTitle }}</h2>
          <p class="text-slate-700">{{ pageSubtitle }}</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <Button v-if="canCreateSource" label="Ajouter une source" @click="sourceDialogVisible = true">
            <template #icon><PlusIcon size="0.9rem" /></template>
          </Button>
          <Button label="Enregistrer la vue" @click="saveDialog = true">
            <template #icon><BookmarkIcon size="0.9rem" /></template>
          </Button>
        </div>
      </div>

      <Message v-if="error" severity="error" closable @close="error = ''">{{ error }}</Message>

      <section class="rounded-xl bg-white p-5 shadow-sm">
        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <InputText v-model="filters.q" class="w-full" placeholder="Rechercher un flux, un titre ou un résumé..."
            @keyup.enter="search" />
          <Select append-to="self" v-model="filters.status" :options="visibleStatusOptions" option-label="label"
            option-value="value" show-clear placeholder="Statut" class="w-full" />
          <Select append-to="self" v-model="filters.criticality" :options="criticalityOptions" option-label="label"
            option-value="value" show-clear placeholder="Importance / Priorité" class="w-full" />
          <Select append-to="self" v-model="filters.watchType" :options="watchTypeOptions" option-label="label"
            option-value="value" show-clear placeholder="Type de veille" class="w-full" />
          <Select append-to="self" v-model="filters.sourceType" :options="sourceTypeOptions" option-label="label"
            option-value="value" show-clear placeholder="Type de source" class="w-full" />
          <Button label="Réinitialiser" severity="secondary" class="xl:col-span-2" @click="resetFilters">
            <template #icon>
              <FilterSlashIcon size="0.9rem" />
            </template>
          </Button>
        </div>
      </section>

      <section v-if="savedViews.length || extrasLoading" class="rounded-xl bg-white p-4 shadow-sm">
        <p class="mb-3 text-sm font-semibold text-slate-700">Vues enregistrées</p>
        <div class="flex flex-wrap gap-2">
          <div v-for="view in savedViews" :key="view.id"
            class="flex min-w-36 max-w-56 items-center rounded-lg bg-slate-100 text-slate-700">
            <button type="button" class="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left text-xs font-medium"
              :title="`Appliquer la vue « ${view.name} »`" @click="applyView(view)">
              <BookmarkIcon class="shrink-0" size="0.85rem" />
              <span class="truncate">{{ view.name }}</span>
            </button>
            <button type="button"
              class="grid h-8 w-8 shrink-0 place-items-center rounded-md border-0 bg-transparent text-red-600 hover:bg-red-100 hover:text-red-700"
              aria-label="Supprimer la vue" :title="`Supprimer la vue « ${view.name} »`" @click="viewToDelete = view">
              <TrashIcon size="0.85rem" />
            </button>
          </div>
          <AppSpinner v-if="extrasLoading" size="small" label="Chargement…" />
        </div>
      </section>

      <div class="rounded-xl bg-white p-3 shadow-sm">
        <DataTable class="compact-table" :value="items" :loading="loading" data-key="id" lazy paginator
          :first="(filters.page - 1) * filters.limit" :rows="filters.limit" :rows-per-page-options="[10, 20, 50]"
          :total-records="total" :sort-field="filters.sortBy" :sort-order="filters.sortOrder === 'ASC' ? 1 : -1"
          @page="changePage" @sort="changeSort">
          <template #empty>Aucun élément ne correspond aux critères sélectionnés.</template>
          <Column header="Flux" sort-field="sourceName" sortable style="width: 12rem">
            <template #body="{ data }">
              <div class="font-medium text-slate-800">{{ data.source?.name ?? 'Non renseigné' }}</div>
              <div class="mt-1 text-xs text-slate-500">{{ labelFr(data.watchType) }}</div>
            </template>
          </Column>
          <Column header="Type de source" sort-field="sourceType" sortable style="width: 8rem">
            <template #body="{ data }">
              <Tag :value="labelFr(
                data.source?.sourceType
              )
                " severity="info" />
            </template>
          </Column>
          <Column field="title" header="Titre" sortable style="min-width: 16rem">
            <template #body="{ data }">
              <button class="text-left font-semibold leading-5 text-slate-900 hover:text-emerald-700"
                @click="router.push(`/watch-items/${data.id}`)">
                {{ data.title }}
              </button>
            </template>
          </Column>
          <Column header="Publication" sort-field="publishedAt" sortable style="width: 10rem">
            <template #body="{ data }">{{ formatDate(data.publishedAt) }}</template>
          </Column>
          <Column header="Résumé" sort-field="summary" sortable style="min-width: 22rem">
            <template #body="{ data }">
              <p class="watch-summary">{{ data.summary || 'Aucun résumé disponible.' }}</p>
            </template>
          </Column>
          <Column header="Importance" sort-field="relevance" sortable style="width: 10rem">
            <template #body="{ data }">
              <Tag :value="data.criticality
                ? labelFr(
                  data.criticality
                )
                : 'Non qualifiée'
                " :severity="prioritySeverity(
                  data.criticality
                )
                  " />
            </template>
          </Column>
          <Column header="Statut" sort-field="status" sortable style="width: 8rem">
            <template #body="{ data }">
              <Tag :value="labelFr(data.status)" :severity="statusSeverity(data.status)" />
            </template>
          </Column>
          <Column header="Actions">
            <template #body="{ data }">
              <div class="flex flex-nowrap items-center gap-1.5">
                <Button label="Veille" size="small" @click="router.push(`/watch-items/${data.id}`)">
                  <template #icon>
                    <ArrowRightIcon size="0.85rem" />
                  </template>
                </Button>
                <Button v-if="canQualify && ['NOUVEAU', 'A_QUALIFIER'].includes(data.status)" aria-label="Qualifier"
                  title="Qualifier" severity="secondary" size="small" rounded
                  @click="router.push(`/watch-items/${data.id}/qualification`)">
                  <template #icon>
                    <CheckCircleIcon size="0.85rem" />
                  </template>
                </Button>
                <Button :aria-label="favorites.includes(data.id) ? 'Retirer des favoris' : 'Ajouter aux favoris'"
                  :title="favorites.includes(data.id) ? 'Retirer des favoris' : 'Ajouter aux favoris'"
                  severity="secondary" size="small" rounded :loading="favoriteBusy.includes(data.id)"
                  @click="toggleFavorite(data.id)">
                  <template #icon>
                    <StarFillIcon v-if="favorites.includes(data.id)" size="0.85rem" />
                    <StarIcon v-else size="0.85rem" />
                  </template>
                </Button>
                <Button v-if="data.url" as="a" :href="data.url" target="_blank" rel="noopener noreferrer"
                  aria-label="Ouvrir la source" title="Ouvrir la source dans un nouvel onglet" severity="secondary"
                  size="small" rounded>
                  <template #icon>
                    <ExternalLinkIcon size="0.85rem" />
                  </template>
                </Button>
              </div>
            </template>
          </Column>
        </DataTable>
      </div>

      <Dialog v-model:visible="saveDialog" modal header="Enregistrer la vue" class="w-full max-w-md">
        <form class="space-y-4" @submit.prevent="saveView">
          <div>
            <label for="saved-view-name" class="required-label mb-2 block font-medium">Nom de la vue</label>
            <InputText id="saved-view-name" v-model="viewName" class="w-full" placeholder="Exemple : Veilles critiques"
              maxlength="150" autofocus />
          </div>
          <div class="flex justify-end gap-2">
            <Button type="button" label="Annuler" severity="secondary" @click="saveDialog = false" />
            <Button type="submit" label="Enregistrer" :disabled="!viewName.trim()" />
          </div>
        </form>
      </Dialog>

      <Dialog :visible="Boolean(viewToDelete)" modal header="Supprimer la vue" class="w-full max-w-md"
        :closable="!deletingView" :close-on-escape="!deletingView"
        @update:visible="(visible) => { if (!visible && !deletingView) viewToDelete = null; }">
        <div class="space-y-5">
          <p>
            Êtes-vous sûr de vouloir supprimer la vue
            <strong>« {{ viewToDelete?.name }} »</strong> ?
          </p>
          <div class="flex justify-end gap-2">
            <Button label="Annuler" severity="secondary" :disabled="deletingView" @click="viewToDelete = null" />
            <Button label="Supprimer" severity="danger" :loading="deletingView" @click="removeSavedView">
              <template #icon>
                <TrashIcon size="0.85rem" />
              </template>
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog v-model:visible="sourceDialogVisible" modal header="Nouvelle source" class="w-full max-w-2xl">
        <form class="space-y-4" @submit.prevent="submitSource">
          <Message v-if="sourceError" severity="error">{{ sourceError }}</Message>

          <div class="grid gap-4 md:grid-cols-2">
            <div>
              <label class="required-label mb-2 block">Nom</label>
              <InputText v-model="sourceForm.name" class="w-full" required />
            </div>
            <div>
              <label class="mb-2 block">Organisme</label>
              <InputText v-model="sourceForm.organization" class="w-full" />
            </div>
            <div>
              <label class="mb-2 block">Pays</label>
              <InputText v-model="sourceForm.country" class="w-full" />
            </div>
            <div>
              <label class="required-label mb-2 block">Catégorie</label>
              <Select append-to="self" v-model="sourceForm.category"
                :options="optionsFr(sourceCategoryOptions)" option-label="label" option-value="value"
                class="w-full" required />
            </div>
            <div>
              <label class="required-label mb-2 block">Type</label>
              <Select append-to="self" v-model="sourceForm.sourceType"
                :options="optionsFr(sourceCreationTypeOptions)" option-label="label" option-value="value"
                class="w-full" required />
            </div>
            <div v-if="sourceForm.sourceType !== 'IMPORT_MANUEL'">
              <label class="mb-2 block">Fréquence</label>
              <InputText v-model="sourceForm.frequency" class="w-full" placeholder="Ex. : 30m, 6h ou 1j" />
            </div>
          </div>

          <div v-if="sourceForm.sourceType !== 'IMPORT_MANUEL'">
            <label class="required-label mb-2 block">Adresse de la source</label>
            <InputText v-model="sourceForm.baseUrl" class="w-full" placeholder="https://..."
              :disabled="sourceForm.sourceType === 'API'" required />
          </div>

          <div v-if="sourceForm.sourceType !== 'IMPORT_MANUEL'">
            <label class="mb-2 block font-medium">Critères de recherche</label>
            <InputText v-model="targetQuery" class="w-full" />
            <p class="mt-2 text-sm text-slate-500">
              Ces critères de recherche sont proposés automatiquement selon la catégorie. Vous pouvez la compléter ou la modifier.
              Séparez les expressions par des virgules.
            </p>
            <p v-if="sourceForm.sourceType === 'API'" class="mt-1 text-xs text-slate-500">
              Pour une API, cette query est également envoyée au service distant.
            </p>
            <p v-if="['RSS', 'ATOM'].includes(sourceForm.sourceType)" class="mt-1 text-xs text-slate-500">
              Pour RSS/Atom, le flux est récupéré puis filtré localement selon ces termes.
            </p>
          </div>

          <div v-if="auth.isAdmin" class="flex items-center gap-2">
            <Checkbox v-if="sourceForm.sourceType !== 'IMPORT_MANUEL'" v-model="createWithConnector" binary />
            <span v-if="sourceForm.sourceType !== 'IMPORT_MANUEL'">Créer aussi le connecteur de collecte</span>
          </div>

          <div class="flex justify-end gap-3">
            <Button type="button" label="Annuler" severity="secondary" @click="sourceDialogVisible = false" />
            <Button type="submit" label="Créer la source" :loading="sourceSubmitting" />
          </div>
        </form>
      </Dialog>

    </div>
  </AppLayout>
</template>

<style scoped>
.watch-summary {
  display: -webkit-box;
  overflow: hidden;
  color: var(--app-text-secondary);
  line-height: 1.45;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}
</style>
