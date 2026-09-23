<script setup lang="ts">
import { onMounted, ref } from 'vue';
import Button from 'primevue/button'; import Column from 'primevue/column'; import DataTable from 'primevue/datatable'; import Message from 'primevue/message'; import Tag from 'primevue/tag';
import { useToast } from 'primevue/usetoast';
import AppLayout from '../layouts/AppLayout.vue'; import { labelFr } from '../i18n/labels'; import { getHealth, retryConnector } from '../services/health.service';
import { actionError, actionSuccess } from '../utils/action-toast';
import { statusSeverity } from '../utils/status-severity';
const health = ref<any>({ connectors: [] }); const loading = ref(false); const retryingId = ref<number | null>(null); const error = ref('');
const toast = useToast();
function formatDate(value?: string | null) { if (!value) return 'Jamais'; return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)); }
async function load() { loading.value = true; error.value = ''; try { health.value = (await getHealth()).data; } catch { error.value = 'Impossible de charger l’état du système.'; } finally { loading.value = false; } }
async function retry(id: number) { retryingId.value = id; error.value = ''; try { await retryConnector(id); actionSuccess(toast, 'Collecte relancée', 'La nouvelle tentative de collecte est terminée.'); await load(); } catch (cause) { error.value = 'La relance de la collecte a échoué.'; actionError(toast, cause, 'Relance impossible', error.value); } finally { retryingId.value = null; } }
onMounted(load);
</script>
<template><AppLayout><div class="space-y-5"><h2 class="text-2xl font-bold text-slate-900">Santé du système</h2><Message v-if="error" severity="error">{{ error }}</Message><div class="flex items-center gap-3 rounded-xl bg-white p-5 shadow-sm"><span class="font-semibold">Base de données :</span><Tag :value="labelFr(health.database)" :severity="health.database === 'UP' ? 'success' : 'danger'" /></div><div class="rounded-xl bg-white p-5 shadow-sm"><DataTable :value="health.connectors" :loading="loading" striped-rows><Column field="source" header="Source" /><Column header="Statut"><template #body="{ data }"><Tag :value="labelFr(data.status)" :severity="statusSeverity(data.status)" /></template></Column><Column header="Dernière synchronisation"><template #body="{ data }">{{ formatDate(data.lastSyncAt) }}</template></Column><Column header="Action"><template #body="{ data }"><Button v-if="data.status === 'ERROR'" label="Réessayer" size="small" :loading="retryingId === data.id" :disabled="retryingId !== null" @click="retry(data.id)" /></template></Column></DataTable></div></div></AppLayout></template>
