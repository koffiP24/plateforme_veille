<script setup lang="ts">
withDefaults(defineProps<{ size?: 'small' | 'medium' | 'large'; label?: string; centered?: boolean }>(), {
  size: 'medium', label: '', centered: false,
});
</script>
<template>
  <span class="app-spinner-wrap" :class="[{ centered }, `size-${size}`]" role="status" :aria-label="label || 'Chargement en cours'">
    <svg class="app-spinner" viewBox="0 0 50 50" aria-hidden="true">
      <circle class="spinner-track" cx="25" cy="25" r="20" fill="none" stroke-width="5" />
      <path class="spinner-head" fill="none" stroke-width="5" stroke-linecap="round" d="M25 5a20 20 0 0 1 20 20" />
    </svg>
    <span v-if="label" class="spinner-label">{{ label }}</span>
  </span>
</template>
<style scoped>
.app-spinner-wrap{display:inline-flex;align-items:center;gap:.55rem;color:var(--app-text-secondary)}.app-spinner-wrap.centered{display:flex;min-height:7rem;justify-content:center}.app-spinner{flex:none;animation:spinner-rotate .8s linear infinite}.size-small .app-spinner{width:1rem;height:1rem}.size-medium .app-spinner{width:1.45rem;height:1.45rem}.size-large .app-spinner{width:2.25rem;height:2.25rem}.spinner-track{stroke:color-mix(in srgb,#10b981 18%,var(--app-border))}.spinner-head{stroke:#10b981}.spinner-label{font-size:.8rem;font-weight:600}@keyframes spinner-rotate{to{transform:rotate(360deg)}}@media(prefers-reduced-motion:reduce){.app-spinner{animation-duration:1.6s}}
</style>
