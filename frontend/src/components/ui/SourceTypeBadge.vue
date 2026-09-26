<script setup lang="ts">
import {
  computed,
} from 'vue';

import {
  labelFr,
} from '../../i18n/labels';

const props =
  withDefaults(
    defineProps<{
      type:
      string
      |
      null
      |
      undefined;
    }>(),
    {
      type:
        null,
    },
  );

const displayLabel =
  computed(
    () =>
      labelFr(
        props.type,
      ),
  );

const typeClass =
  computed(
    () => {
      switch (
      props.type
      ) {
        case 'API':
          return 'source-api';

        case 'RSS':
          return 'source-rss';

        case 'ATOM':
          return 'source-atom';

        case 'IMPORT_MANUEL':
          return 'source-import';

        default:
          return 'source-default';
      }
    },
  );
</script>

<template>
  <span class="source-badge" :class="typeClass
    ">
    {{ displayLabel }}
  </span>
</template>

<style scoped>
.source-badge {
  display: inline-flex;

  align-items: center;

  padding:
    0.27rem 0.58rem;

  border-radius:
    0.55rem;

  font-size:
    0.65rem;

  font-weight:
    700;

  white-space:
    nowrap;
}

.source-api {
  background:
    rgb(59 130 246 / 0.12);

  color:
    #60a5fa;
}

.source-rss {
  background:
    rgb(168 85 247 / 0.12);

  color:
    #c084fc;
}

.source-atom {
  background:
    rgb(20 184 166 / 0.12);

  color:
    #2dd4bf;
}

.source-import {
  background:
    rgb(245 158 11 / 0.12);

  color:
    #fbbf24;
}

.source-default {
  background:
    rgb(100 116 139 / 0.14);

  color:
    #94a3b8;
}
</style>