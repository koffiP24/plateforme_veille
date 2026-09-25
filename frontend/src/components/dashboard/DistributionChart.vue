<script setup lang="ts">
import { computed } from 'vue';
import type { DashboardDistributionItem } from '../../services/dashboard.service';
const props = withDefaults(defineProps<{ title: string; items: DashboardDistributionItem[]; variant?: 'bars' | 'donut' }>(), { variant: 'bars' });
const normalized = computed(() => props.items.map(item => ({ ...item, value: Number(item.value) || 0 })).filter(item => item.value > 0));
const maximum = computed(() => Math.max(1, ...normalized.value.map(item => item.value)));
const translations: Record<string, string> = {
  AVAILABLE: 'Disponible', ERROR: 'En erreur', RUNNING: 'Collecte en cours', NOT_TESTED: 'Non testé',
  WITHOUT_CONNECTOR: 'Sans connecteur', SANS_CONNECTEUR: 'Sans connecteur', INACTIVE: 'Inactive',
  NOUVEAU: 'Nouveau', A_QUALIFIER: 'À qualifier', VALIDE: 'Validée', PUBLIE: 'Publiée', REJETE: 'Rejetée', ARCHIVE: 'Archivée',
  NON_RENSEIGNEE: 'Non renseignée', FAIBLE: 'Faible', MOYENNE: 'Moyenne', ELEVEE: 'Élevée', CRITIQUE: 'Critique',
  OPEN: 'Ouverte', IN_PROGRESS: 'En cours', COMPLETED: 'Terminée', CANCELLED: 'Annulée',
};
function label(value: string) {
  return translations[value.toUpperCase()] ?? value.replaceAll('_', ' ').toLocaleLowerCase('fr-FR').replace(/^./, letter => letter.toUpperCase());
}
function color(value: string, index: number) {
  const normalizedLabel = value.toUpperCase();
  if (['ERROR', 'CRITIQUE', 'REJETE', 'CANCELLED'].includes(normalizedLabel)) return '#ef4444';
  if (['ELEVEE', 'A_QUALIFIER', 'OPEN', 'NOT_TESTED'].includes(normalizedLabel)) return '#f59e0b';
  if (['AVAILABLE', 'PUBLIE', 'VALIDE', 'COMPLETED'].includes(normalizedLabel)) return '#10b981';
  if (['IN_PROGRESS', 'RUNNING', 'MOYENNE'].includes(normalizedLabel)) return '#2563eb';
  return ['#2563eb','#8b5cf6','#06b6d4','#64748b'][index % 4];
}
const total = computed(() => normalized.value.reduce((sum, item) => sum + item.value, 0));
const segments = computed(() => {
  let offset = 0;
  return normalized.value.map((item, index) => {
    const percentage = total.value ? item.value / total.value : 0;
    const segment = { ...item, percentage, offset, color: color(item.label, index) };
    offset += percentage;
    return segment;
  });
});
</script>
<template>
  <section class="distribution-card">
    <h3>{{ title }}</h3>
    <div v-if="normalized.length && variant === 'donut'" class="donut-layout">
      <div class="donut-wrap">
        <svg viewBox="0 0 120 120" role="img" :aria-label="title">
          <circle class="donut-track" cx="60" cy="60" r="44" />
          <circle v-for="segment in segments" :key="segment.label" class="donut-segment" cx="60" cy="60" r="44"
            :stroke="segment.color" :stroke-dasharray="`${segment.percentage * 276.46} ${276.46 - segment.percentage * 276.46}`"
            :stroke-dashoffset="-segment.offset * 276.46" />
        </svg>
        <div class="donut-total"><strong>{{ total.toLocaleString('fr-FR') }}</strong><span>Total</span></div>
      </div>
      <div class="donut-legend">
        <div v-for="segment in segments" :key="segment.label" class="legend-item" :style="{ '--legend-color': segment.color }">
          <i /><span>{{ label(segment.label) }}</span><strong>{{ segment.value.toLocaleString('fr-FR') }}</strong>
        </div>
      </div>
    </div>
    <div v-else-if="normalized.length" class="bars">
      <div v-for="(item,index) in normalized" :key="item.label" class="bar-row">
        <div class="bar-label"><span>{{ label(item.label) }}</span><strong>{{ item.value.toLocaleString('fr-FR') }}</strong></div>
        <div class="track"><div class="fill" :style="{ width: `${item.value / maximum * 100}%`, background: color(item.label, index) }" /></div>
      </div>
    </div>
    <p v-else class="empty">Aucune donnée disponible.</p>
  </section>
</template>
<style scoped>
.distribution-card { min-width:0; padding:.85rem; border:1px solid var(--app-border); border-radius:.8rem; background:var(--app-surface); }
h3 { margin:0 0 .7rem; color:var(--app-text); font-size:.9rem; }.bars{display:grid;gap:.55rem}.bar-label{display:flex;justify-content:space-between;gap:1rem;color:var(--app-text-secondary);font-size:.74rem}.bar-label strong{color:var(--app-text)}
.track{height:.55rem;margin-top:.3rem;overflow:hidden;border-radius:999px;background:var(--app-surface-strong)}.fill{height:100%;min-width:.35rem;border-radius:inherit;transition:width .5s ease}.empty{color:var(--app-text-muted);font-size:.85rem}
.donut-layout{display:grid;grid-template-columns:8.5rem minmax(0,1fr);align-items:center;gap:.8rem}.donut-wrap{position:relative;width:8.5rem;height:8.5rem}.donut-wrap svg{display:block;width:100%;height:100%;transform:rotate(-90deg)}.donut-track,.donut-segment{fill:none;stroke-width:14}.donut-track{stroke:var(--app-surface-strong)}.donut-segment{stroke-linecap:butt;transition:stroke-dasharray .45s ease}.donut-total{position:absolute;inset:0;display:grid;place-content:center;text-align:center}.donut-total strong{color:var(--app-text);font-size:1.2rem;line-height:1}.donut-total span{margin-top:.2rem;color:var(--app-text-muted);font-size:.62rem;text-transform:uppercase}.donut-legend{display:flex;align-content:center;gap:.35rem;flex-wrap:wrap}.legend-item{display:grid;grid-template-columns:.45rem minmax(0,1fr) auto;align-items:center;gap:.35rem;min-width:8.5rem;padding:.35rem .5rem;border:1px solid color-mix(in srgb,var(--legend-color) 25%,transparent);border-radius:.45rem;background:color-mix(in srgb,var(--legend-color) 11%,var(--app-surface));color:var(--app-text-secondary);font-size:.68rem}.legend-item i{width:.42rem;height:.42rem;border-radius:999px;background:var(--legend-color)}.legend-item strong{color:var(--app-text);font-size:.72rem}
@media(max-width:520px){.donut-layout{grid-template-columns:1fr}.donut-wrap{margin:auto}.donut-legend{justify-content:center}}
</style>
