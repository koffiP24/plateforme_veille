<script setup lang="ts">
import { onMounted, ref } from 'vue';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Message from 'primevue/message';
import AppLayout from '../layouts/AppLayout.vue';
import { getAuditLogs } from '../services/audit.service';

const logs = ref<any[]>([]); const loading = ref(false); const error = ref('');
const actionLabels: Record<string, string> = {
  CREATE_SOURCE: 'Création d’une source', UPDATE_SOURCE: 'Modification d’une source',
  ACTIVATE_SOURCE: 'Activation d’une source', DEACTIVATE_SOURCE: 'Désactivation d’une source',
  CREATE_FOLLOW_UP_ACTION: 'Création d’une action de suivi', UPDATE_FOLLOW_UP_ACTION: 'Modification d’une action de suivi',
  CREATE_USER: 'Création d’un utilisateur', ACTIVATE_USER: 'Activation d’un utilisateur',
  DEACTIVATE_USER: 'Désactivation d’un utilisateur', UPDATE_USER_ROLES: 'Modification des rôles',
  VALIDATE_WATCH_ITEM: 'Validation d’une veille', REJECT_WATCH_ITEM: 'Rejet d’une veille',
  PUBLISH_WATCH_ITEM: 'Publication d’une veille', ARCHIVE_WATCH_ITEM: 'Archivage d’une veille',
};
const entityLabels: Record<string, string> = { sources: 'Sources', users: 'Utilisateurs', watch_items: 'Veilles', follow_up_actions: 'Actions de suivi' };
function formatDate(value: string) { return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)); }
async function load() { loading.value = true; error.value = ''; try { logs.value = (await getAuditLogs()).data; } catch { error.value = 'Impossible de charger le journal d’audit.'; } finally { loading.value = false; } }
onMounted(load);
</script>
<template><AppLayout><div class="space-y-5"><h2 class="text-2xl font-bold text-slate-900">Journal d’audit</h2><Message v-if="error" severity="error">{{ error }}</Message><div class="rounded-xl bg-white p-5 shadow-sm"><DataTable :value="logs" :loading="loading" paginator :rows="20" striped-rows><Column header="Action"><template #body="{ data }">{{ actionLabels[data.action] ?? data.action }}</template></Column><Column header="Entité"><template #body="{ data }">{{ entityLabels[data.entity] ?? data.entity }}</template></Column><Column field="entityId" header="Identifiant" /><Column header="Utilisateur"><template #body="{ data }">{{ data.user ? `${data.user.firstName} ${data.user.lastName}` : 'Système' }}</template></Column><Column header="Date"><template #body="{ data }">{{ formatDate(data.createdAt) }}</template></Column></DataTable></div></div></AppLayout></template>
