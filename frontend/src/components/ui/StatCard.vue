<script setup lang="ts">
withDefaults(defineProps<{
  label: string;
  value: number | string;
  trend?: 'up' | 'down' | 'none';
  icon?: string;
}>(), {
  trend: 'none',
  icon: '',
});
</script>

<template>
  <article class="stat-card">
    <div class="stat-card-icon" v-if="icon">
      <i :class="icon" aria-hidden="true" />
    </div>
    <div class="stat-card-content">
      <span class="stat-card-label">{{ label }}</span>
      <strong class="stat-card-value">{{ typeof value === 'number' ? value.toLocaleString('fr-FR') : value }}</strong>
    </div>
    <i
      v-if="trend === 'up'"
      class="pi pi-arrow-up-right"
      aria-hidden="true"
    />
    <i
      v-else-if="trend === 'down'"
      class="pi pi-arrow-down-right"
      aria-hidden="true"
    />
  </article>
</template>

<style scoped>
.stat-card {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.9rem 1rem;
  border: 1px solid var(--app-border);
  border-radius: var(--tw-radius-card);
  background: var(--app-surface);
  box-shadow: var(--tw-shadow-card);
}

.stat-card:hover {
  box-shadow: var(--tw-shadow-card-hover);
}

.stat-card-icon {
  display: grid;
  place-items: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.6rem;
  background: color-mix(in srgb, var(--color-accent-turquoise) 12%, transparent);
  color: var(--color-accent-turquoise);
}

.stat-card-icon i {
  font-size: 1.1rem;
}

.stat-card-content {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.stat-card-label {
  color: var(--app-text-secondary);
  font-size: 0.74rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.stat-card-value {
  color: var(--app-text);
  font-size: 1.3rem;
  font-weight: 700;
  line-height: 1.2;
}

.stat-card i.pi {
  margin-left: auto;
  font-size: 0.9rem;
  color: var(--app-text-muted);
}
</style>
