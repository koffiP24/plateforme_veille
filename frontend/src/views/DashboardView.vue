<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import Message from 'primevue/message';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import Skeleton from 'primevue/skeleton';
import AppLayout from '../layouts/AppLayout.vue';
import { labelFr } from '../i18n/labels';
import { useAuthStore } from '../stores/auth';
import { getDashboard, type DashboardSummary } from '../services/dashboard.service';

const auth = useAuthStore();
const router = useRouter();
const data = ref<DashboardSummary | null>(null);
const loading = ref(false);
const error = ref('');
const updatedAt = ref('');
const qualification = computed(() => data.value?.access === 'qualification' ? data.value : null);
const cards = computed(() => {
  const summary = qualification.value;
  if (!summary) return [];
  const result = [
    { label: 'Éléments collectés', value: summary.counts.total, description: 'Toutes les veilles enregistrées', color: 'text-slate-900' },
    { label: 'Nouvelles veilles', value: summary.counts.newItems, description: 'Statut « Nouveau »', color: 'text-blue-700' },
    { label: 'Qualifications à compléter', value: summary.counts.toQualify, description: 'Pertinence ou criticité manquante', color: 'text-amber-700' },
    { label: 'Qualifications renseignées', value: summary.counts.qualificationFilled, description: 'Pertinence et criticité renseignées', color: 'text-emerald-700' },
  ];
  if (auth.user?.roles.some(role => ['ADMIN', 'RESPONSABLE_VEILLE'].includes(role))) {
    result.push({ label: 'Criticité élevée ou critique', value: summary.counts.highCriticality, description: 'Selon la qualification enregistrée', color: 'text-red-700' });
  }
  if (summary.administration) {
    result.push(
      { label: 'Sources actives', value: summary.administration.activeSources, description: 'Sources activées', color: 'text-blue-700' },
      { label: 'Utilisateurs actifs', value: summary.administration.activeUsers, description: 'Comptes autorisés à se connecter', color: 'text-emerald-700' },
      { label: 'Collectes avec erreurs', value: summary.administration.failedRuns, description: 'Sur les 7 derniers jours', color: 'text-red-700' },
    );
  }
  return result;
});
const dateFormatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date non renseignée' : dateFormatter.format(date);
}
async function load() {
  if (loading.value) return;
  loading.value = true;
  error.value = '';
  try {
    data.value = (await getDashboard()).data;
    updatedAt.value = formatDate(new Date().toISOString());
  } catch {
    error.value = 'Impossible de charger le tableau de bord. Recharge la page pour réessayer.';
  } finally { loading.value = false; }
}
onMounted(load);
</script>

<template>
  <AppLayout>
    <div class="space-y-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 class="text-2xl font-bold text-slate-900">Tableau de bord</h2>
          <p class="mt-1 text-slate-600">Bienvenue {{ auth.user?.firstName }}.</p>
        </div>
      </div>
      <Message v-if="error" severity="error">{{ error }}</Message>
      <div v-if="loading && !data" class="grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-label="Chargement du tableau de bord">
        <Skeleton v-for="n in 4" :key="n" height="9rem" />
      </div>
      <template v-if="qualification">
        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article v-for="card in cards" :key="card.label" class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 class="text-sm font-medium text-slate-600">{{ card.label }}</h3>
            <p class="my-3 text-3xl font-bold" :class="card.color">{{ card.value.toLocaleString('fr-FR') }}</p>
            <p class="text-xs text-slate-500">{{ card.description }}</p>
          </article>
        </div>
        <p class="text-sm text-slate-500">Une qualification renseignée n’est pas une validation. Les indicateurs portent sur l’ensemble des veilles, pas uniquement sur les saisies.</p>
        <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 class="text-lg font-semibold text-slate-900">Derniers éléments à qualifier</h3>
            <Button label="Voir les veilles" severity="secondary" size="small" @click="router.push('/watch-items')" />
          </div>
          <p v-if="!qualification.recentItems.length" class="py-5 text-slate-500">Aucune qualification à compléter pour le moment.</p>
          <ul v-else class="divide-y divide-slate-100">
            <li v-for="item in qualification.recentItems" :key="item.id" class="flex flex-wrap items-center justify-between gap-4 py-4">
              <div class="min-w-0 flex-1">
                <p class="font-medium text-slate-900">{{ item.title }}</p>
                <p class="mt-1 text-sm text-slate-500">{{ item.sourceName }} · {{ formatDate(item.collectedAt) }}</p>
                <Tag :value="labelFr(item.status)" severity="secondary" class="mt-2" />
              </div>
              <Button label="Qualifier" size="small" @click="router.push(`/watch-items/${item.id}/qualification`)" />
            </li>
          </ul>
        </section>
        <section class="flex flex-wrap gap-3" aria-label="Accès rapides">
          <Button label="Sources" severity="secondary" @click="router.push('/sources')" />
          <Button v-if="auth.isAdmin" label="Taxonomie" severity="secondary" @click="router.push('/taxonomy')" />
          <Button v-if="auth.isAdmin" label="Utilisateurs" severity="secondary" @click="router.push('/users')" />
        </section>
      </template>
      <section v-else-if="data?.access === 'welcome'" class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 class="text-lg font-semibold text-slate-900">Bienvenue sur votre espace de veille</h3>
        <p class="mt-3 text-slate-600">La consultation des veilles publiées sera disponible dans une prochaine étape. Les éléments en cours de qualification sont réservés à l’équipe de veille.</p>
      </section>
      <p v-if="updatedAt" class="text-xs text-slate-500">Dernière actualisation : {{ updatedAt }}</p>
    </div>
  </AppLayout>
</template>
