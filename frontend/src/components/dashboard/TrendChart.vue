<script setup lang="ts">
import { computed } from 'vue';
import type { DashboardPoint, DashboardSeries } from '../../services/dashboard.service';
const props = defineProps<{ title: string; points: DashboardPoint[]; series: DashboardSeries[] }>();
const width = 900, height = 210, left = 42, right = 14, top = 14, bottom = 32;
const values = computed(() => props.points.flatMap(point => props.series.map(series => Number(point[series.key]) || 0)));
const maximum = computed(() => Math.max(1, ...values.value));
function coordinates(key: string) {
  const usableWidth = width - left - right;
  const usableHeight = height - top - bottom;
  return props.points.map((point, index) => {
    const x = left + (props.points.length <= 1 ? 0 : index * usableWidth / (props.points.length - 1));
    const y = top + usableHeight - (Number(point[key]) || 0) / maximum.value * usableHeight;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
}
const ticks = computed(() => [0, .25, .5, .75, 1].map(ratio => ({
  y: top + (height - top - bottom) * (1 - ratio),
  label: Math.round(maximum.value * ratio),
})));
const dateLabels = computed(() => {
  if (!props.points.length) return [];
  const indices = [...new Set([0, Math.floor((props.points.length - 1) / 2), props.points.length - 1])];
  return indices.map(index => ({
    x: left + (props.points.length <= 1 ? 0 : index * (width - left - right) / (props.points.length - 1)),
    label: new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' }).format(new Date(`${props.points[index].date}T00:00:00`)),
  }));
});
</script>

<template>
  <section class="chart-card">
    <div class="chart-heading"><h3>{{ title }}</h3><div class="legend"><span v-for="item in series" :key="item.key"><i :style="{ background: item.color }" />{{ item.label }}</span></div></div>
    <div v-if="points.length" class="chart-scroll">
      <svg :viewBox="`0 0 ${width} ${height}`" role="img" :aria-label="title">
        <g v-for="tick in ticks" :key="tick.y"><line :x1="left" :x2="width-right" :y1="tick.y" :y2="tick.y" class="grid-line"/><text x="34" :y="tick.y + 4" text-anchor="end" class="axis-text">{{ tick.label }}</text></g>
        <polyline v-for="item in series" :key="item.key" :points="coordinates(item.key)" fill="none" :stroke="item.color" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" />
        <text v-for="label in dateLabels" :key="label.x" :x="label.x" :y="height-10" text-anchor="middle" class="axis-text">{{ label.label }}</text>
      </svg>
    </div>
    <p v-else class="empty">Aucune donnée sur cette période.</p>
  </section>
</template>

<style scoped>
.chart-card { padding: .85rem; border: 1px solid var(--app-border); border-radius: .8rem; background: var(--app-surface); }
.chart-heading { display:flex; align-items:flex-start; justify-content:space-between; gap:1rem; flex-wrap:wrap; }
h3 { margin:0; color:var(--app-text); font-size:.9rem; }
.legend { display:flex; gap:.8rem; flex-wrap:wrap; color:var(--app-text-secondary); font-size:.75rem; }
.legend span { display:flex; align-items:center; gap:.3rem; }.legend i { width:.65rem; height:.65rem; border-radius:999px; }
.chart-scroll { margin-top:.55rem; overflow:hidden; } svg { width:100%; min-width:36rem; display:block; }
.grid-line { stroke:var(--app-border); stroke-width:1; opacity:.65; }.axis-text { fill:var(--app-text-muted); font-size:11px; }
.empty { padding:4rem 1rem; text-align:center; color:var(--app-text-muted); }
</style>
