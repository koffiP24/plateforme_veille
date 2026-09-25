<script setup lang="ts">
withDefaults(defineProps<{
  title: string;
  subtitle?: string;
  icon?: string;
}>(), {
  subtitle: '',
  icon: '',
});
</script>

<template>
  <header class="page-header">
    <div class="page-header-title">
      <h1>
        <i v-if="icon" :class="icon" aria-hidden="true" />
        {{ title }}
      </h1>
      <p v-if="subtitle" class="page-header-subtitle">{{ subtitle }}</p>
    </div>

    <nav class="page-header-actions">
      <slot name="actions" />
    </nav>
  </header>
</template>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1.25rem;
}

.page-header-title h1 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  color: var(--app-text);
  font-size: 1.25rem;
  font-weight: 700;
}

.page-header-title h1 i {
  color: var(--color-accent-turquoise);
  font-size: 1rem;
}

.page-header-subtitle {
  margin-top: 0.25rem;
  color: var(--app-text-secondary);
  font-size: 0.8rem;
}

.page-header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}

@media (max-width: 640px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .page-header-actions {
    width: 100%;
    justify-content: stretch;
  }
}
</style>
