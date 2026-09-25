<script setup lang="ts">
import { onBeforeUnmount, watch, ref } from 'vue';
const props = defineProps<{ label: string; value: number; tone?: 'success' | 'warning' | 'danger' | 'info' }>();
const displayed = ref(0);
let frame: number | undefined;
watch(() => props.value, (target) => {
  if (frame) cancelAnimationFrame(frame);
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { displayed.value = target; return; }
  const initial = displayed.value;
  const started = performance.now();
  const animate = (now: number) => {
    const progress = Math.min((now - started) / 650, 1);
    displayed.value = Math.round(initial + (target - initial) * (1 - Math.pow(1 - progress, 3)));
    if (progress < 1) frame = requestAnimationFrame(animate);
  };
  frame = requestAnimationFrame(animate);
}, { immediate: true });
onBeforeUnmount(() => frame && cancelAnimationFrame(frame));
</script>

<template>
  <article class="metric-card" :class="`metric-${tone ?? 'success'}`">
    <div class="metric-accent" aria-hidden="true" />
    <span>{{ label }}</span>
    <strong>{{ displayed.toLocaleString('fr-FR') }}</strong>
  </article>
</template>

<style scoped>
.metric-card { position:relative; min-height: 5rem; overflow:hidden; padding: .8rem .9rem .7rem 1rem; border: 1px solid var(--metric-border); border-radius: .8rem; background: linear-gradient(135deg,var(--metric-bg),color-mix(in srgb,var(--metric-bg) 82%,var(--app-surface))); box-shadow:0 4px 12px rgb(15 23 42 / .06); }
.metric-card::after { content:""; position:absolute; right:-1.1rem; bottom:-1.5rem; width:4.5rem; height:4.5rem; border-radius:999px; background:var(--metric-color); opacity:.07; }
.metric-accent { position:absolute; inset:.7rem auto .7rem 0; width:.22rem; border-radius:0 999px 999px 0; background:var(--metric-color); }
.metric-card span { position:relative; display: block; color: var(--app-text-secondary); font-size: .76rem; font-weight: 650; }
.metric-card strong { position:relative; display: block; margin-top: .45rem; color: var(--metric-color); font-size: 1.45rem; line-height: 1; }
.metric-success { --metric-border:#a7f3d0; --metric-bg:#ecfdf5; --metric-color:#047857; }
.metric-warning { --metric-border:#fde68a; --metric-bg:#fffbeb; --metric-color:#b45309; }
.metric-danger { --metric-border:#fecaca; --metric-bg:#fef2f2; --metric-color:#dc2626; }
.metric-info { --metric-border:#bfdbfe; --metric-bg:#eff6ff; --metric-color:#1d4ed8; }
@media (prefers-color-scheme: dark) {
  .metric-success { --metric-border:#065f46; --metric-bg:#052e2b; --metric-color:#6ee7b7; }
  .metric-warning { --metric-border:#92400e; --metric-bg:#2d2108; --metric-color:#fbbf24; }
  .metric-danger { --metric-border:#991b1b; --metric-bg:#320d12; --metric-color:#fca5a5; }
  .metric-info { --metric-border:#1e40af; --metric-bg:#101d3a; --metric-color:#93c5fd; }
}
</style>
