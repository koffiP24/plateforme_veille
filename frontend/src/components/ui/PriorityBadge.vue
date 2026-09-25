<script setup lang="ts">
import { computed } from 'vue';
import {
  getPriorityColor,
  getPriorityLabel,
  getPriorityLevel,
  type PriorityLevel,
} from '../../utils/priority';

const props = withDefaults(defineProps<{
  score?: number | null;
  level?: PriorityLevel | null;
}>(), {
  score: null,
  level: null,
});

const resolvedLevel = computed<PriorityLevel>(() => {
  if (props.level) return props.level;
  if (props.score !== null && props.score !== undefined) return getPriorityLevel(props.score);
  return 'FAIBLE';
});

const label = computed(() => {
  if (props.level) {
    const labels: Record<PriorityLevel, string> = {
      FAIBLE: "Faible",
      MOYENNE: "Moyenne",
      ELEVEE: "Elevée",
      CRITIQUE: "Critique",
    };
    return labels[props.level];
  }
  return getPriorityLabel(props.score ?? 0);
});

const dotColor = computed(() => {
  if (props.level) {
    const colors: Record<PriorityLevel, string> = {
      FAIBLE: "#31966e",
      MOYENNE: "#d6a125",
      ELEVEE: "#e08032",
      CRITIQUE: "#d34848",
    };
    return colors[props.level];
  }
  return getPriorityColor(props.score ?? 0);
});

const severityClass = computed(() => {
  const map: Record<PriorityLevel, string> = {
    FAIBLE: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    MOYENNE: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    ELEVEE: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    CRITIQUE: 'bg-red-500/15 text-red-400 border-red-500/30',
  };
  return map[resolvedLevel.value];
});
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap"
    :class="severityClass"
  >
    <span
      class="h-1.5 w-1.5 rounded-full"
      :style="{ backgroundColor: dotColor }"
      aria-hidden="true"
    />
    {{ label }}
  </span>
</template>
