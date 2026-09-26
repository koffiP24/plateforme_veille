<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string;
    description?: string;
    icon?: string;
  }>(),
  {
    title:
      'Aucune donnée',

    description:
      '',

    icon:
      'pi pi-inbox',
  },
);
</script>

<template>
  <div class="empty-state">

    <div class="empty-icon">
      <i :class="icon" />
    </div>

    <h3>
      {{ title }}
    </h3>

    <p v-if="description">
      {{ description }}
    </p>

    <slot />

  </div>
</template>

<style scoped>
.empty-state {
  display: flex;

  min-height:
    12rem;

  flex-direction: column;

  align-items: center;

  justify-content: center;

  padding:
    2rem;

  text-align: center;
}

.empty-icon {
  display: grid;

  width:
    3.3rem;

  height:
    3.3rem;

  place-items: center;

  border-radius:
    999px;

  background:
    var(--app-surface-2);

  color:
    var(--app-text-muted);
}

.empty-icon i {
  font-size:
    1.25rem;
}

.empty-state h3 {
  margin:
    0.8rem 0 0;

  color:
    var(--app-text-secondary);

  font-size:
    0.9rem;
}

.empty-state p {
  max-width:
    28rem;

  margin:
    0.35rem 0 0;

  color:
    var(--app-text-muted);

  font-size:
    0.76rem;
}
</style>