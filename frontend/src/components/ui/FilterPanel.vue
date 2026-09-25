<script setup lang="ts">
import InputText from 'primevue/inputtext';
import { ref } from 'vue';

const props = withDefaults(defineProps<{
  modelValue: Record<string, any>;
  placeholder?: string;
  searchPlaceholder?: string;
}>(), {
  modelValue: () => ({}),
  placeholder: 'Filtrer...',
  searchPlaceholder: 'Rechercher...',
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: Record<string, any>): void;
  (e: 'clear'): void;
}>();

const searchTerm = ref('');

function onSearch(value: string) {
  searchTerm.value = value;
  emit('update:modelValue', { ...props.modelValue, search: value });
}

function onClear() {
  searchTerm.value = '';
  emit('update:modelValue', {});
  emit('clear');
}
</script>

<template>
  <aside class="filter-panel">
    <div class="filter-panel-search">
      <InputText
        v-model="searchTerm"
        :placeholder="searchPlaceholder"
        class="filter-search-input"
        @input="onSearch((($event.target) as HTMLInputElement).value)"
      />
      <i v-if="searchTerm" class="pi pi-times filter-search-clear" @click="onClear" />
    </div>

    <nav class="filter-panel-tags">
      <slot name="filters" />
    </nav>

    <div class="filter-panel-actions">
      <button
        type="button"
        class="filter-clear-btn"
        @click="onClear"
      >
        <i class="pi pi-trash" /> Effacer
      </button>
    </div>

    <slot />
  </aside>
</template>

<style scoped>
.filter-panel {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  padding: 0.75rem 1rem;
  border: 1px solid var(--app-border);
  border-radius: var(--tw-radius-card);
  background: var(--app-surface);
  box-shadow: var(--tw-shadow-card);
  margin-bottom: 1rem;
}

.filter-panel-search {
  position: relative;
  display: flex;
  align-items: center;
  flex: 1 1 200px;
  min-width: 200px;
}

.filter-search-input {
  width: 100%;
  padding-left: 2.25rem;
}

.filter-search-clear {
  position: absolute;
  left: 0.6rem;
  color: var(--app-text-muted);
  cursor: pointer;
  font-size: 0.85rem;
}

.filter-panel-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.filter-panel-actions {
  margin-left: auto;
}

.filter-clear-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.4rem 0.7rem;
  border: 1px solid var(--app-border);
  border-radius: 0.4rem;
  background: var(--app-surface-2);
  color: var(--app-text-secondary);
  font-size: 0.78rem;
  cursor: pointer;
  transition: border-color 150ms ease, background-color 150ms ease;
}

.filter-clear-btn:hover {
  background: var(--color-accent-turquoise);
  color: var(--color-app-bg-emphasis);
}

@media (max-width: 640px) {
  .filter-panel {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-panel-actions {
    width: 100%;
  }
}
</style>
