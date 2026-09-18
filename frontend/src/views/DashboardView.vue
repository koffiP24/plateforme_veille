<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import Card from 'primevue/card';
import Message from 'primevue/message';
import Skeleton from 'primevue/skeleton';
import Tag from 'primevue/tag';
import AppLayout from '../layouts/AppLayout.vue';
import { getDashboard, type DashboardStats } from '../services/dashboard.service';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const stats = ref<DashboardStats>({});
const loading = ref(true);
const error = ref('');
const labels: Record<string, string> = {
  sourcesActive: 'Sources actives', sourcesInactive: 'Sources inactives',
  usersActive: 'Utilisateurs actifs',
  toValidate: 'Veilles à valider', critical: 'Veilles critiques',
  openActions: 'Actions ouvertes', collectionErrors: 'Erreurs de collecte',
  published: 'Veilles publiées', criticalPublished: 'Veilles critiques publiées',
  validated: 'Veilles validées à publier', recentCollections: 'Collectes sur 7 jours',
  newItems: 'Nouvelles veilles', toQualify: 'Veilles à qualifier',
  qualified: 'Veilles traitées', assignedOpenActions: 'Mes actions en cours',
  assignedLateActions: 'Mes actions en retard', recentlyPublished: 'Publiées sur 7 jours',
};
const dashboardRole = computed(() => {
  const roles = auth.user?.roles ?? [];
  if (roles.includes('ADMIN')) return 'Pilotage administratif';
  if (roles.includes('RESPONSABLE_VEILLE')) return 'Pilotage de la veille';
  if (roles.includes('OPERATEUR_VEILLE')) return 'Collecte et qualification';
  if (roles.includes('REFERENT_LABORATOIRE')) return 'Suivi du laboratoire';
  return 'Consultation';
});
const cards = computed(() => Object.entries(stats.value).map(([key, value]) => ({
  key, label: labels[key] ?? key, value,
})));

async function load() {
  loading.value = true; error.value = '';
  try { stats.value = (await getDashboard()).data; }
  catch { error.value = 'Impossible de charger les indicateurs du tableau de bord.'; }
  finally { loading.value = false; }
}
onMounted(load);
</script>

<template>
  <AppLayout>
    <div class="space-y-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 class="text-2xl font-bold text-slate-900">Tableau de bord</h2>
        <Tag :value="dashboardRole" severity="secondary" />
      </div>
      <Message v-if="error" severity="error">{{ error }}</Message>
      <div v-if="loading" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Skeleton v-for="index in 4" :key="index" height="8rem" /></div>
      <div v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card v-for="card in cards" :key="card.key" class="border border-slate-200 shadow-sm">
          <template #title><span class="text-sm font-semibold text-slate-600">{{ card.label }}</span></template>
          <template #content><div class="text-3xl font-bold text-emerald-700">{{ card.value.toLocaleString('fr-FR') }}</div></template>
        </Card>
      </div>
    </div>
  </AppLayout>
</template>
