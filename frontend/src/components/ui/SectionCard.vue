<script setup lang="ts">
withDefaults(defineProps<{
  title?: string;
  subtitle?: string;
  icon?: string;
  compact?: boolean;
}>(), {
  title: '',
  subtitle: '',
  icon: '',
  compact: false,
});
</script>

<template>
  <section
    class="section-card"
    :class="{ 'section-card-compact': compact }"
  >
    <header v-if="title || icon" class="section-card-header">
      <h3 v-if="title" class="section-card-title">
        <i v-if="icon" :class="icon" aria-hidden="true" />
        {{ title }}
      </h3>
      <p v-if="subtitle" class="section-card-subtitle">{{ subtitle }}</p>
    </header>

    <div class="section-card-body">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.section-card {
  border: 1px solid var(--app-border);
  border-radius: var(--tw-radius-card);
  background: var(--app-surface);
  box-shadow: var(--tw-shadow-card);
  transition: box-shadow 150ms ease, transform 150ms ease;
}

.section-card:hover {
  box-shadow: var(--tw-shadow-card-hover);
  transform: translateY(-1px);
}

.section-card-compact {
  box-shadow: none;
}

.section-card-compact:hover {
  box-shadow: var(--tw-shadow-card);
  transform: none;
}

.section-card-header {
  padding: 0.85rem 1rem 0.5rem;
  border-bottom: 1px solid var(--app-border);
}

.section-card-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  color: var(--app-text);
  font-size: 0.9rem;
  font-weight: 600;
}

.section-card-title i {
  color: var(--color-accent-turquoise);
  font-size: 0.85rem;
}

.section-card-subtitle {
  margin: 0.2rem 0 0;
  color: var(--app-text-secondary);
  font-size: 0.76rem;
}

.section-card-body {
  padding: 1rem;
}

@media (max-width: 640px) {
  .section-card-body {
    padding: 0.75rem;
  }
}
</style>
