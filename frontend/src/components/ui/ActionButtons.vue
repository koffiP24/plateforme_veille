<script setup lang="ts">
import Button from 'primevue/button';

const emit = defineEmits<{
  (e: 'primary'): void;
  (e: 'secondary'): void;
  (e: 'delete'): void;
}>();

withDefaults(defineProps<{
  primaryLabel?: string;
  secondaryLabel?: string;
  showDelete?: boolean;
  deleteLabel?: string;
  primaryDisabled?: boolean;
  primaryLoading?: boolean;
  secondaryDisabled?: boolean;
}>(), {
  primaryLabel: 'Enregistrer',
  secondaryLabel: 'Annuler',
  showDelete: false,
  deleteLabel: 'Supprimer',
  primaryDisabled: false,
  primaryLoading: false,
  secondaryDisabled: false,
});
</script>

<template>
  <div class="action-buttons">
    <Button
      v-if="showDelete"
      :label="deleteLabel"
      severity="danger"
      size="small"
      class="action-btn action-delete"
      @click="$emit('delete')"
    />
    <Button
      :label="secondaryLabel"
      severity="secondary"
      size="small"
      class="action-btn action-secondary"
      :disabled="secondaryDisabled"
      @click="$emit('secondary')"
    />
    <Button
      :label="primaryLabel"
      size="small"
      class="action-btn action-primary"
      :loading="primaryLoading"
      :disabled="primaryDisabled || primaryLoading"
      @click="$emit('primary')"
    />
  </div>
</template>

<style scoped>
.action-buttons {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.action-btn {
  min-width: 80px;
}

.action-primary {
  background: var(--color-accent-turquoise);
  border-color: var(--color-accent-turquoise);
}

.action-primary:hover {
  background: var(--color-accent-turquoise-hover);
  border-color: var(--color-accent-turquoise-hover);
}

.action-delete {
  background: var(--color-accent-red);
  border-color: var(--color-accent-red);
}

.action-delete:hover {
  background: color-mix(in srgb, var(--color-accent-red) 90%, black);
  border-color: color-mix(in srgb, var(--color-accent-red) 90%, black);
}

.action-secondary {
  background: var(--app-surface-2);
  border-color: var(--app-border);
}

.action-secondary:hover {
  background: var(--app-surface-3);
}
</style>
