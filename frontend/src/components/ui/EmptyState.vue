<script setup lang="ts">
withDefaults(defineProps<{
  title?: string;
  description?: string;
  icon?: string;
}>(), {
  title: 'Aucune donnée',
  description: '',
  icon: 'pi pi-inbox',
});
</script>

<template>
  <div class="empty-state">
    <i :class="icon" class="empty-state-icon" aria-hidden="true" />
    <h3 class="empty-state-title">{{ title }}</h3>
    <p v-if="description" class="empty-state-description">{{ description }}</p>
    <slot />
  </div>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2.5rem 1rem;
  text-align: center;
}

.empty-state-icon {
  font-size: 2.5rem;
  color: var(--app-text-muted);
  opacity: 0.5;
  margin-bottom: 0.75rem;
}

.empty-state-title {
  margin: 0;
  color: var(--app-text-secondary);
  font-size: 0.95rem;
  font-weight: 600;
}

.empty-state-description {
  margin-top: 0.4rem;
  color: var(--app-text-muted);
  font-size: 0.8rem;
}
</style>
