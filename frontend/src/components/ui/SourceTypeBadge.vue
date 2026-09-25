<script setup lang="ts">
import { computed } from 'vue';
import { labelFr } from '../../i18n/labels';

const props = withDefaults(defineProps<{
  type: string | null | undefined;
}>(), {
  type: null,
});

const displayLabel = computed(() => labelFr(props.type));

const colorClass = computed(() => {
  const t = (props.type ?? '').toUpperCase();
  if (t.includes('API')) return 'bg-sky-500/15 text-sky-400 border-sky-500/30';
  if (t.includes('RSS')) return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
  if (t.includes('ATOM')) return 'bg-teal-500/15 text-teal-400 border-teal-500/30';
  if (t.includes('MANUAL') || t.includes('IMPORT')) return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
  return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
});
</script>

<template>
  <span
    class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap"
    :class="colorClass"
    :title="displayLabel"
  >
    {{ displayLabel }}
  </span>
</template>
