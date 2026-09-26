<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string;
    subtitle?: string;
    icon?: string;
    eyebrow?: string;
  }>(),
  {
    subtitle: '',
    icon: '',
    eyebrow: '',
  },
);
</script>

<template>
  <header class="page-header">

    <div class="page-heading">

      <span v-if="icon" class="page-icon">
        <i :class="icon" aria-hidden="true" />
      </span>

      <div>
        <span v-if="eyebrow" class="page-eyebrow">
          {{ eyebrow }}
        </span>

        <h1>
          {{ title }}
        </h1>

        <p v-if="subtitle">
          {{ subtitle }}
        </p>
      </div>

    </div>


    <div class="page-actions">
      <slot name="actions" />
    </div>

  </header>
</template>

<style scoped>
.page-header {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;

  align-items: center;
  justify-content: space-between;

  gap: 1.25rem;

  margin-bottom:
    1.25rem;
}

.page-heading {
  display: flex;

  min-width: 0;

  align-items: center;

  gap: 0.85rem;
}

.page-icon {
  display: grid;

  width: 3.2rem;
  height: 3.2rem;

  flex:
    0 0 3.2rem;

  place-items: center;

  border-radius:
    999px;

  background:
    rgb(16 185 129 / 0.11);

  color:
    var(--app-primary);
}

.page-icon i {
  font-size:
    1.2rem;
}

.page-eyebrow {
  display: block;

  margin-bottom:
    0.12rem;

  color:
    var(--app-primary);

  font-size:
    0.62rem;

  font-weight:
    800;

  letter-spacing:
    0.13em;

  text-transform:
    uppercase;
}

.page-header h1 {
  margin: 0;

  color:
    var(--app-text);

  font-size:
    1.55rem;

  font-weight:
    780;
}

.page-header p {
  margin:
    0.25rem 0 0;

  color:
    var(--app-text-muted);

  font-size:
    0.8rem;
}

.page-actions {
  display: flex;
  max-width: 100%;

  flex-wrap: wrap;

  align-items: center;

  gap: 0.6rem;
}

@media (max-width: 640px) {
  .page-header {
    align-items:
      flex-start;

    flex-direction:
      column;
  }

  .page-actions {
    width: 100%;
  }
}
</style>
