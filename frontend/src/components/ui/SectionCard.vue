<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string;
    subtitle?: string;
    icon?: string;
    compact?: boolean;
  }>(),
  {
    title: '',
    subtitle: '',
    icon: '',
    compact: false,
  },
);
</script>

<template>
  <section class="section-card" :class="{
    'section-card-compact':
      compact,
  }">

    <header v-if="
      title
      ||
      subtitle
      ||
      icon
    " class="section-header">

      <div>
        <h3 v-if="title">
          <i v-if="icon" :class="icon" aria-hidden="true" />

          {{ title }}
        </h3>

        <p v-if="subtitle">
          {{ subtitle }}
        </p>
      </div>

      <slot name="actions" />

    </header>


    <div class="section-body">
      <slot />
    </div>

  </section>
</template>

<style scoped>
.section-card {
  min-width: 0;
  overflow: visible;

  border:
    1px solid var(--app-border);

  border-radius:
    var(--app-radius);

  background:
    linear-gradient(145deg,
      var(--app-surface),
      var(--app-card-end));

  box-shadow:
    var(--app-shadow-soft);
}

.section-card-compact {
  box-shadow: none;
}

.section-card:has(.p-select-overlay, .p-multiselect-overlay) {
  position: relative;
  z-index: 20;
}

.section-header {
  display: flex;

  align-items: center;
  justify-content: space-between;

  gap: 1rem;

  padding:
    0.9rem 1rem 0.75rem;
}

.section-header h3 {
  display: flex;

  align-items: center;

  gap: 0.45rem;

  margin: 0;

  color:
    var(--app-text);

  font-size:
    0.9rem;

  font-weight:
    700;
}

.section-header h3 i {
  color:
    var(--app-primary);
}

.section-header p {
  margin:
    0.2rem 0 0;

  color:
    var(--app-text-muted);

  font-size:
    0.73rem;
}

.section-body {
  min-width: 0;
  padding:
    0.9rem 1rem 1rem;
}

@media (max-width: 640px) {
  .section-body {
    padding:
      0.75rem;
  }
}
</style>
