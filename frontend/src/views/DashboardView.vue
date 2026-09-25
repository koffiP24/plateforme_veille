<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import Message from 'primevue/message';
import Select from 'primevue/select';
import Tag from 'primevue/tag';
import AppLayout from '../layouts/AppLayout.vue';
import MetricCard from '../components/dashboard/MetricCard.vue';
import TrendChart from '../components/dashboard/TrendChart.vue';
import DistributionChart from '../components/dashboard/DistributionChart.vue';
import { getDashboard, getDashboardAnalytics, type DashboardAnalytics, type DashboardStats } from '../services/dashboard.service';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const stats = ref<DashboardStats>({});
const analytics = ref<DashboardAnalytics | null>(null);
const loading = ref(true);
const error = ref('');
const period = ref(30);
const periods = [{ label: '7 derniers jours', value: 7 }, { label: '30 derniers jours', value: 30 }, { label: '3 derniers mois', value: 90 }, { label: '12 derniers mois', value: 365 }];
const labels: Record<string, string> = {
  sourcesActive: 'Sources actives', sourcesInactive: 'Sources inactives', usersActive: 'Utilisateurs actifs',
  toValidate: 'Veilles à valider', critical: 'Veilles importantes', openActions: 'Actions ouvertes', collectionErrors: 'Erreurs de collecte',
  published: 'Veilles publiées', criticalPublished: 'Publications importantes', validated: 'Veilles validées à publier',
  recentCollections: 'Collectes sur la période', newItems: 'Nouvelles veilles', toQualify: 'Veilles à qualifier', qualified: 'Veilles traitées',
  assignedOpenActions: 'Mes actions en cours', assignedLateActions: 'Mes actions en retard', recentlyPublished: 'Publiées sur la période', unreadNotifications: 'Notifications non lues',
};
const dashboardRole = computed(() => {
  const roles = auth.user?.roles ?? [];
  if (roles.includes('ADMIN')) return 'Pilotage administratif';
  if (roles.includes('RESPONSABLE_VEILLE')) return 'Pilotage de la veille';
  if (roles.includes('OPERATEUR_VEILLE')) return 'Collecte et qualification';
  if (roles.includes('REFERENT_LABORATOIRE')) return 'Suivi du laboratoire';
  return 'Consultation';
});
const topSourcesTitle = computed(() => {
  const roles = auth.user?.roles ?? [];
  const canSeeInternalItems = roles.some(role =>
    ['ADMIN', 'RESPONSABLE_VEILLE', 'OPERATEUR_VEILLE'].includes(role),
  );
  return canSeeInternalItems ? 'Sources les plus actives' : 'Sources les plus publiées';
});
const cards = computed(() => Object.entries(stats.value).map(([key, value]) => ({ key, label: labels[key] ?? key, value })));
const dangerKeys = new Set(['collectionErrors', 'assignedLateActions', 'critical', 'criticalPublished']);
const warningKeys = new Set(['toValidate', 'toQualify', 'newItems', 'openActions', 'validated', 'unreadNotifications']);
const infoKeys = new Set(['recentCollections', 'recentlyPublished']);
let refreshTimer: ReturnType<typeof setInterval> | undefined;
let refreshing = false;
function tone(key: string): 'success' | 'warning' | 'danger' | 'info' {
  if (dangerKeys.has(key)) return 'danger'; if (warningKeys.has(key)) return 'warning'; if (infoKeys.has(key)) return 'info'; return 'success';
}
function readable(value: string) { return value.replaceAll('_', ' ').toLocaleLowerCase('fr-FR').replace(/^./, letter => letter.toUpperCase()); }
function formatDate(value: string | null) { return value ? new Intl.DateTimeFormat('fr-FR').format(new Date(`${value}T00:00:00`)) : 'Sans échéance'; }
async function load(showLoading = true) {
  if (refreshing || (!showLoading && document.visibilityState !== 'visible')) return;
  refreshing = true; if (showLoading) loading.value = true; error.value = '';
  try {
    const [statsResponse, analyticsResponse] = await Promise.all([getDashboard(period.value), getDashboardAnalytics(period.value)]);
    stats.value = statsResponse.data; analytics.value = analyticsResponse.data;
  } catch { error.value = 'Impossible de charger les indicateurs du tableau de bord.'; }
  finally { loading.value = false; refreshing = false; }
}
function refreshWhenVisible() { if (document.visibilityState === 'visible') void load(false); }
watch(period, () => void load());
onMounted(() => {
  void load(); window.addEventListener('actions-changed', refreshWhenVisible); window.addEventListener('notifications-changed', refreshWhenVisible);
  document.addEventListener('visibilitychange', refreshWhenVisible); refreshTimer = setInterval(refreshWhenVisible, 30000);
});
onBeforeUnmount(() => {
  if (refreshTimer) clearInterval(refreshTimer); window.removeEventListener('actions-changed', refreshWhenVisible);
  window.removeEventListener('notifications-changed', refreshWhenVisible); document.removeEventListener('visibilitychange', refreshWhenVisible);
});
</script>

<template>
  <AppLayout><div class="dashboard-page">
    <header class="dashboard-header"><div><h2><b>Tableau de bord</b></h2></div><div class="header-actions"><Tag :value="dashboardRole" severity="secondary" /><Select append-to="self" v-model="period" :options="periods" option-label="label" option-value="value" class="period-select" aria-label="Période d'analyse" /></div></header>
    <Message v-if="error" severity="error">{{ error }}</Message>
    <div v-if="loading" class="loading-panel"><AppSpinner size="large" centered label="Chargement du tableau de bord…" /></div>
    <template v-else>
      <div class="metric-grid"><MetricCard v-for="card in cards" :key="card.key" :label="card.label" :value="card.value" :tone="tone(card.key)" /></div>
      <TrendChart v-if="analytics" :title="analytics.timeline.title" :points="analytics.timeline.points" :series="analytics.timeline.series" />
      <div v-if="analytics" class="distribution-grid"><DistributionChart v-for="(distribution, key) in analytics.distributions" :key="key" :title="distribution.title" :items="distribution.items" :variant="key === 'tertiary' ? 'bars' : 'donut'" /></div>
      <div v-if="analytics" class="details-grid" :class="{ 'has-actions': analytics.dueActions.length }">
        <section class="detail-card sources-card"><h3><i class="pi pi-database" /> {{ topSourcesTitle }}</h3><ol v-if="analytics.topSources.length"><li v-for="(source, index) in analytics.topSources" :key="source.label"><span class="rank">{{ index + 1 }}</span><span class="item-name">{{ source.label }}</span><strong>{{ source.value }}</strong></li></ol><p v-else>Aucune source disponible.</p></section>
        <section v-if="analytics.urgentItems.length" class="detail-card urgent-card"><h3><i class="pi pi-exclamation-triangle" /> Veilles importantes récentes</h3><ul><li v-for="item in analytics.urgentItems" :key="item.id"><div><strong>{{ item.title }}</strong><small>{{ item.sourceName }}</small></div><Tag :value="readable(item.criticality)" severity="danger" /></li></ul></section>
        <section v-if="analytics.dueActions.length" class="detail-card actions-card"><h3><i class="pi pi-clock" /> Actions à suivre</h3><ul><li v-for="action in analytics.dueActions" :key="action.id"><div><strong>{{ action.title }}</strong><small>{{ action.watchItemTitle }}</small></div><span class="due-date">{{ formatDate(action.dueDate) }}</span></li></ul></section>
      </div>
    </template>
  </div></AppLayout>
</template>

<style scoped>
.loading-panel{border:1px solid var(--app-border);border-radius:.8rem;background:var(--app-surface)}
.dashboard-page{display:grid;gap:.9rem}.dashboard-header{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;flex-wrap:wrap}.dashboard-header h2{margin:0;color:var(--app-text);font-size:1.25rem}.dashboard-header p{margin:.2rem 0 0;color:var(--app-text-secondary);font-size:.8rem}.header-actions{display:flex;align-items:center;gap:.6rem;flex-wrap:wrap}.period-select{width:11.5rem}.period-select:deep(.p-select-overlay){left:0!important;right:auto!important;top:calc(100% + .3rem)!important;width:100%;min-width:100%!important}.metric-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(12rem,1fr));gap:.7rem}.distribution-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.8rem}.details-grid{display:grid;grid-template-columns:minmax(16rem,2fr) minmax(22rem,3fr);align-items:start;gap:.8rem}.details-grid.has-actions{grid-template-columns:repeat(3,minmax(0,1fr))}.detail-card{min-width:0;padding:.85rem;border:1px solid var(--app-border);border-radius:.8rem;background:var(--app-surface);box-shadow:0 3px 10px rgb(15 23 42 / .04)}.detail-card h3{display:flex;align-items:center;gap:.45rem;margin:0 0 .65rem;color:var(--app-text);font-size:.9rem}.detail-card h3 i{color:#10b981;font-size:.85rem}.urgent-card h3 i{color:#ef4444}.actions-card h3 i{color:#f59e0b}.detail-card ol,.detail-card ul{display:grid;gap:.2rem;margin:0;padding:0;list-style:none}.detail-card li{display:flex;align-items:flex-start;justify-content:space-between;gap:.7rem;padding:.5rem 0;border-bottom:1px solid var(--app-border);color:var(--app-text-secondary);font-size:.75rem}.detail-card li:last-child{border-bottom:0}.detail-card li>div{min-width:0}.detail-card li strong{display:block;color:var(--app-text);line-height:1.35;overflow-wrap:anywhere}.detail-card li small{display:block;margin-top:.15rem;color:var(--app-text-muted)}.rank{display:grid;flex:0 0 1.35rem;width:1.35rem;height:1.35rem;place-items:center;border-radius:999px;background:var(--app-surface-strong);color:var(--app-text-secondary);font-size:.65rem;font-weight:700}.item-name{flex:1;min-width:0}.due-date{flex:none;color:#b45309;font-weight:650}.detail-card p{color:var(--app-text-muted);font-size:.78rem}
@media(max-width:1100px){.distribution-grid{grid-template-columns:1fr 1fr}.details-grid,.details-grid.has-actions{grid-template-columns:1fr 1fr}}@media(max-width:680px){.metric-grid,.distribution-grid,.details-grid,.details-grid.has-actions{grid-template-columns:1fr}.header-actions{width:100%;justify-content:space-between}.period-select{width:10.5rem}}
</style>
