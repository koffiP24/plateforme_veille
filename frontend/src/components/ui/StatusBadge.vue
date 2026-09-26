<script setup lang="ts">
import {
  computed,
} from 'vue';

import {
  statusSeverity,
  type StatusSeverity,
} from '../../utils/status-severity';

import {
  labelFr,
} from '../../i18n/labels';

const props =
  withDefaults(
    defineProps<{
      status:
      string
      |
      null
      |
      undefined;

      severity?:
      StatusSeverity;
    }>(),
    {
      severity:
        undefined,
    },
  );

const resolvedSeverity =
  computed<StatusSeverity>(
    () =>
      props.severity
      ??
      statusSeverity(
        props.status,
      ),
  );

const displayLabel =
  computed(
    () =>
      labelFr(
        props.status,
      ),
  );
</script>

<template>
  <span class="status-badge" :class="`status-${resolvedSeverity}`
    ">
    <span class="status-dot" />

    {{ displayLabel }}
  </span>
</template>

<style scoped>
.status-badge {
  display: inline-flex;

  align-items: center;

  gap: 0.38rem;

  padding:
    0.28rem 0.58rem;

  border-radius:
    999px;

  font-size:
    0.66rem;

  font-weight:
    700;

  white-space:
    nowrap;
}

.status-dot {
  width: 0.38rem;
  height: 0.38rem;

  border-radius:
    999px;

  background:
    currentColor;
}

.status-success {
  background:
    rgb(16 185 129 / 0.12);

  color:
    #34d399;
}

.status-info {
  background:
    rgb(59 130 246 / 0.12);

  color:
    #60a5fa;
}

.status-warn {
  background:
    rgb(245 158 11 / 0.12);

  color:
    #fbbf24;
}

.status-danger {
  background:
    rgb(239 68 68 / 0.12);

  color:
    #f87171;
}

.status-secondary {
  background:
    rgb(100 116 139 / 0.14);

  color:
    #94a3b8;
}
</style>