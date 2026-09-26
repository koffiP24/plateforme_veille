<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string;

    value:
    number
    |
    string;

    trend?:
    'up'
    |
    'down'
    |
    'none';

    icon?:
    string;
  }>(),
  {
    trend:
      'none',

    icon:
      '',
  },
);
</script>

<template>
  <article class="stat-card">

    <div v-if="icon" class="stat-icon">
      <i :class="icon" />
    </div>


    <div class="stat-copy">

      <span>
        {{ label }}
      </span>

      <strong>
        {{
          typeof value ===
            'number'
            ? value.toLocaleString(
              'fr-FR',
            )
            : value
        }}
      </strong>

    </div>


    <i v-if="
      trend ===
      'up'
    " class="pi pi-arrow-up-right trend-up" />

    <i v-else-if="
      trend ===
      'down'
    " class="pi pi-arrow-down-right trend-down" />

  </article>
</template>

<style scoped>
.stat-card {
  display: flex;

  min-height:
    5rem;

  align-items: center;

  gap:
    0.8rem;

  padding:
    0.9rem 1rem;

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

.stat-icon {
  display: grid;

  width:
    2.5rem;

  height:
    2.5rem;

  flex:
    0 0 2.5rem;

  place-items: center;

  border-radius:
    0.75rem;

  background:
    rgb(16 185 129 / 0.11);

  color:
    var(--app-primary);
}

.stat-copy {
  display: grid;

  min-width: 0;

  flex: 1;

  gap:
    0.15rem;
}

.stat-copy span {
  color:
    var(--app-text-muted);

  font-size:
    0.65rem;

  font-weight:
    700;

  text-transform:
    uppercase;

  letter-spacing:
    0.045em;
}

.stat-copy strong {
  color:
    var(--app-text);

  font-size:
    1.3rem;

  font-weight:
    800;
}

.trend-up {
  color:
    #34d399;
}

.trend-down {
  color:
    #f87171;
}
</style>
