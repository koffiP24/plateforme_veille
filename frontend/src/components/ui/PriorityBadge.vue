<script setup lang="ts">
import {
  computed,
} from 'vue';

import {
  getPriorityLabel,
  getPriorityLevel,
  type PriorityLevel,
} from '../../utils/priority';

const props =
  withDefaults(
    defineProps<{
      score?:
      number
      |
      null;

      level?:
      PriorityLevel
      |
      null;
    }>(),
    {
      score:
        null,

      level:
        null,
    },
  );

const resolvedLevel =
  computed<PriorityLevel>(
    () => {
      if (
        props.level
      ) {
        return props.level;
      }

      return getPriorityLevel(
        props.score
        ??
        0,
      );
    },
  );

const label =
  computed(
    () => {
      if (
        props.level
      ) {
        const labels:
          Record<
            PriorityLevel,
            string
          > = {
          FAIBLE:
            'Faible',

          MOYENNE:
            'Moyenne',

          ELEVEE:
            'Élevée',

          CRITIQUE:
            'Critique',
        };

        return labels[
          props.level
        ];
      }

      return getPriorityLabel(
        props.score
        ??
        0,
      );
    },
  );
</script>

<template>
  <span class="priority-badge" :class="`priority-${resolvedLevel.toLowerCase()}`
    ">
    <span class="priority-dot" />

    {{ label }}
  </span>
</template>

<style scoped>
.priority-badge {
  display: inline-flex;

  align-items: center;

  gap: 0.38rem;

  padding:
    0.28rem 0.6rem;

  border-radius:
    999px;

  font-size:
    0.66rem;

  font-weight:
    700;

  white-space:
    nowrap;
}

.priority-dot {
  width:
    0.4rem;

  height:
    0.4rem;

  border-radius:
    999px;

  background:
    currentColor;
}

.priority-faible {
  background:
    rgb(16 185 129 / 0.12);

  color:
    #34d399;
}

.priority-moyenne {
  background:
    rgb(234 179 8 / 0.13);

  color:
    #facc15;
}

.priority-elevee {
  background:
    rgb(249 115 22 / 0.13);

  color:
    #fb923c;
}

.priority-critique {
  background:
    rgb(239 68 68 / 0.13);

  color:
    #f87171;
}
</style>