<script setup lang="ts">
import { computed } from 'vue';
import { statusSeverity, type StatusSeverity } from '../../utils/status-severity';
import { labelFr } from '../../i18n/labels';

const props = withDefaults(defineProps<{
  status: string | null | undefined;
  severity?: StatusSeverity;
}>(), {
  severity: undefined,
});

const resolvedSeverity = computed<StatusSeverity>(() => props.severity ?? statusSeverity(props.status));

const severityColors: Record<StatusSeverity, string> = {
  success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  info: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  warn: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  danger: 'bg-red-500/15 text-red-400 border-red-500/30',
  secondary: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
};

const badgeClass = computed(() => severityColors[resolvedSeverity.value]);
const displayLabel = computed(() => labelFr(props.status));
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap"
    :class="badgeClass"
    :title="displayLabel"
  >
    <span
      class="h-1.5 w-1.5 rounded-full"
      :class="{
        'bg-emerald-400': resolvedSeverity === 'success',
        'bg-sky-400': resolvedSeverity === 'info',
        'bg-amber-400': resolvedSeverity === 'warn',
        'bg-red-400': resolvedSeverity === 'danger',
        'bg-slate-400': resolvedSeverity === 'secondary',
      }"
      aria-hidden="true"
    />
    {{ displayLabel }}
  </span>
</template>

