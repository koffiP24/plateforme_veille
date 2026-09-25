<script setup lang="ts">
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';

const props = withDefaults(defineProps<{
  header?: string;
  message?: string;
  acceptLabel?: string;
  rejectLabel?: string;
}>(), {
  header: 'Êtes-vous sûr ?',
  message: 'Cette action est irréversible.',
  acceptLabel: 'Confirmer',
  rejectLabel: 'Annuler',
});

const confirm = useConfirm();
const toast = useToast();

function confirmAction(handler: () => Promise<void> | void) {
  confirm.require({
    header: props.header,
    message: props.message,
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    acceptLabel: props.acceptLabel,
    rejectLabel: props.rejectLabel,
    async accept() {
      try {
        await handler();
      } catch (error: any) {
        toast.add({
          severity: 'error',
          summary: 'Erreur',
          detail: error.message ?? 'Une erreur est survenue.',
          life: 5000,
        });
      }
    },
  });
}

defineExpose({ confirmAction });
</script>

<template>
  <slot />
</template>
