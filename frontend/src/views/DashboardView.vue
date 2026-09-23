<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import Card from 'primevue/card';
import Message from 'primevue/message';
import Skeleton from 'primevue/skeleton';
import Tag from 'primevue/tag';
import AppLayout from '../layouts/AppLayout.vue';
import { getDashboard, type DashboardStats } from '../services/dashboard.service';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const stats = ref<DashboardStats>({});
const animatedStats = ref<DashboardStats>({});
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
  unreadNotifications: 'Notifications non lues',
};
const dashboardRole = computed(() => {
  const roles = auth.user?.roles ?? [];
  if (roles.includes('ADMIN')) return 'Pilotage administratif';
  if (roles.includes('RESPONSABLE_VEILLE')) return 'Pilotage de la veille';
  if (roles.includes('OPERATEUR_VEILLE')) return 'Collecte et qualification';
  if (roles.includes('REFERENT_LABORATOIRE')) return 'Suivi du laboratoire';
  return 'Consultation';
});
const cards = computed(() => Object.entries(stats.value).map(([key]) => ({
  key, label: labels[key] ?? key, value: animatedStats.value[key] ?? 0,
})));
const dangerKeys = new Set(['collectionErrors', 'assignedLateActions', 'critical', 'criticalPublished']);
const warningKeys = new Set(['toValidate', 'toQualify', 'newItems', 'openActions', 'validated', 'unreadNotifications']);
const infoKeys = new Set(['recentCollections', 'recentlyPublished']);
let animationFrame: number | undefined;
let refreshTimer: ReturnType<typeof setInterval> | undefined;
let refreshing = false;

function cardTone(key: string) {
  if (dangerKeys.has(key)) return 'dashboard-card-danger';
  if (warningKeys.has(key)) return 'dashboard-card-warning';
  if (infoKeys.has(key)) return 'dashboard-card-info';
  return 'dashboard-card-success';
}

function animateCounters(values: DashboardStats) {
  if (animationFrame) cancelAnimationFrame(animationFrame);
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    animatedStats.value = { ...values };
    return;
  }
  animatedStats.value = Object.fromEntries(Object.keys(values).map((key) => [key, 0]));
  const startedAt = performance.now();
  const duration = 650;
  const step = (now: number) => {
    const progress = Math.min((now - startedAt) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    animatedStats.value = Object.fromEntries(
      Object.entries(values).map(([key, value]) => [key, Math.round(value * eased)]),
    );
    if (progress < 1) animationFrame = requestAnimationFrame(step);
  };
  animationFrame = requestAnimationFrame(step);
}

async function load(showLoading = true) {
  if (refreshing || (!showLoading && document.visibilityState !== 'visible')) return;
  refreshing = true;
  if (showLoading) loading.value = true;
  error.value = '';
  try {
    stats.value = (await getDashboard()).data;
    animateCounters(stats.value);
  }
  catch { error.value = 'Impossible de charger les indicateurs du tableau de bord.'; }
  finally {
    if (showLoading) loading.value = false;
    refreshing = false;
  }
}
function refreshDashboard() {
  void load(false);
}
function refreshWhenVisible() {
  if (document.visibilityState === 'visible') refreshDashboard();
}
onMounted(() => {
  void load();
  window.addEventListener('actions-changed', refreshDashboard);
  window.addEventListener('notifications-changed', refreshDashboard);
  document.addEventListener('visibilitychange', refreshWhenVisible);
  refreshTimer = setInterval(refreshDashboard, 15000);
});
onBeforeUnmount(() => {
  if (animationFrame) cancelAnimationFrame(animationFrame);
  if (refreshTimer) clearInterval(refreshTimer);
  window.removeEventListener('actions-changed', refreshDashboard);
  window.removeEventListener('notifications-changed', refreshDashboard);
  document.removeEventListener('visibilitychange', refreshWhenVisible);
});
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
        <Card v-for="card in cards" :key="card.key" class="dashboard-card shadow-sm" :class="cardTone(card.key)">
          <template #title><span class="text-sm font-semibold text-slate-600">{{ card.label }}</span></template>
          <template #content><div class="dashboard-card-value text-3xl font-bold">{{ card.value.toLocaleString('fr-FR') }}</div></template>
        </Card>
      </div>
    </div>
  </AppLayout>
</template>

<style scoped>
.dashboard-card { border: 1px solid var(--card-border); background: var(--card-background); }
.dashboard-card-success { --card-border: #a7f3d0; --card-background: #ecfdf5; }
.dashboard-card-success .dashboard-card-value { color: #047857; }
.dashboard-card-warning { --card-border: #fde68a; --card-background: #fffbeb; }
.dashboard-card-warning .dashboard-card-value { color: #b45309; }
.dashboard-card-danger { --card-border: #fecaca; --card-background: #fef2f2; }
.dashboard-card-danger .dashboard-card-value { color: #dc2626; }
.dashboard-card-info { --card-border: #bfdbfe; --card-background: #eff6ff; }
.dashboard-card-info .dashboard-card-value { color: #1d4ed8; }

@media (prefers-color-scheme: dark) {
  .dashboard-card-success { --card-border: #065f46; --card-background: #052e2b; }
  .dashboard-card-warning { --card-border: #92400e; --card-background: #2d2108; }
  .dashboard-card-danger { --card-border: #991b1b; --card-background: #320d12; }
  .dashboard-card-info { --card-border: #1e40af; --card-background: #101d3a; }
  .dashboard-card-success .dashboard-card-value { color: #6ee7b7; }
  .dashboard-card-warning .dashboard-card-value { color: #fbbf24; }
  .dashboard-card-danger .dashboard-card-value { color: #fca5a5; }
  .dashboard-card-info .dashboard-card-value { color: #93c5fd; }
}
</style>
