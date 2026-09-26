<script setup lang="ts">
import {
  ref,
} from 'vue';

import InputText
  from 'primevue/inputtext';

const props =
  withDefaults(
    defineProps<{
      modelValue:
      Record<string, any>;

      searchPlaceholder?: string;
    }>(),
    {
      modelValue:
        () => ({}),

      searchPlaceholder:
        'Rechercher...',
    },
  );

const emit =
  defineEmits<{
    (
      e:
        'update:modelValue',
      value:
        Record<string, any>,
    ): void;

    (
      e:
        'clear',
    ): void;
  }>();

const searchTerm =
  ref('');

function onSearch(
  value: string,
) {
  searchTerm.value =
    value;

  emit(
    'update:modelValue',
    {
      ...props.modelValue,
      search:
        value,
    },
  );
}

function onClear() {
  searchTerm.value =
    '';

  emit(
    'update:modelValue',
    {},
  );

  emit(
    'clear',
  );
}
</script>

<template>
  <section class="filter-panel">

    <div class="filter-search">

      <i class="pi pi-search" aria-hidden="true" />

      <InputText v-model="searchTerm" :placeholder="searchPlaceholder
        " class="w-full" @input="
          onSearch(
            (
              $event.target as HTMLInputElement
            ).value,
          )
          " />

    </div>


    <div class="filter-options">
      <slot name="filters" />
    </div>


    <button type="button" class="filter-reset" @click="
      onClear
    ">
      <i class="pi pi-filter-slash" />

      Réinitialiser
    </button>

  </section>
</template>

<style scoped>
.filter-panel {
  display: grid;

  grid-template-columns:
    minmax(14rem, 1.5fr) minmax(0, 3fr) auto;

  gap: 0.75rem;

  align-items: center;

  margin-bottom:
    1rem;

  padding:
    0.85rem;

  border:
    1px solid var(--app-border);

  border-radius:
    var(--app-radius);

  background:
    var(--app-surface);

  box-shadow:
    var(--app-shadow-soft);
}

.filter-search {
  position: relative;

  display: flex;

  align-items: center;
}

.filter-search>i {
  position: absolute;

  left: 0.8rem;

  z-index: 2;

  color:
    var(--app-text-muted);

  font-size:
    0.75rem;
}

.filter-search :deep(input) {
  padding-left:
    2.15rem;
}

.filter-options {
  display: flex;

  flex-wrap: wrap;

  align-items: center;

  gap: 0.55rem;
}

.filter-reset {
  display: inline-flex;

  align-items: center;

  gap: 0.4rem;

  min-height:
    2.3rem;

  padding:
    0 0.7rem;

  border: 0;

  border-radius:
    0.65rem;

  background:
    transparent;

  color:
    var(--app-text-muted);

  font-size:
    0.74rem;

  font-weight:
    650;

  cursor: pointer;
}

.filter-reset:hover {
  background:
    var(--app-surface-2);

  color:
    var(--app-text);
}

@media (max-width: 900px) {
  .filter-panel {
    grid-template-columns:
      1fr;
  }
}
</style>