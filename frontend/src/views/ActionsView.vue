<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import Button from 'primevue/button'; import Column from 'primevue/column'; import DataTable from 'primevue/datatable'; import Tag from 'primevue/tag';
import { useRouter } from 'vue-router'; import AppLayout from '../layouts/AppLayout.vue';
import { getAllActions, updateAction, type FollowUpAction } from '../services/actions.service';
import { labelFr } from '../i18n/labels';
import { useAuthStore } from '../stores/auth';
const router = useRouter(); const actions = ref<FollowUpAction[]>([]); const loading = ref(false);
const auth = useAuthStore();
const isReferentOnly = computed(() =>
    auth.user?.roles.includes('REFERENT_LABORATOIRE') &&
    !auth.user?.roles.some((role) => ['ADMIN', 'RESPONSABLE_VEILLE'].includes(role)),
);
async function load() { loading.value = true; try { actions.value = (await getAllActions()).data; } finally { loading.value = false; } }
async function updateStatus(action: FollowUpAction, status: string) { await updateAction(action.id, { status }); await load(); }
function ownerName(action: FollowUpAction) {
    return `${action.owner?.firstName ?? ''} ${action.owner?.lastName ?? ''}`.trim()
        || action.owner?.email
        || 'Non renseigné';
}
onMounted(load);
</script>
<template>
    <AppLayout>
        <div class="space-y-6">
            <h2 class="text-2xl font-bold">{{ isReferentOnly ? 'Mes actions de suivi' : 'Actions de suivi' }}</h2>
            <div class="rounded-xl bg-white p-5 shadow-sm">
                <DataTable :value="actions" :loading="loading" paginator :rows="10">
                    <Column field="title" header="Action" />
                    <Column header="Veille"><template #body="{ data }"><button class="text-blue-600 underline"
                                @click="router.push(`/watch-items/${data.watchItem.id}`)">{{ data.watchItem?.title
                                }}</button></template>
                    </Column>
                    <Column header="Type"><template #body="{ data }">{{ labelFr(data.actionType) }}</template></Column>
                    <Column header="Responsable"><template #body="{ data }">{{ ownerName(data) }}</template></Column>
                    <Column field="dueDate" header="Échéance" />
                    <Column header="Statut"><template #body="{ data }">
                            <Tag :value="labelFr(data.status)" />
                        </template></Column>
                    <Column header="Action"><template #body="{ data }"><Button v-if="data.status === 'OPEN'"
                                label="Démarrer" size="small" @click="updateStatus(data, 'IN_PROGRESS')" /><Button
                                v-else-if="data.status === 'IN_PROGRESS'" label="Terminer" size="small"
                                severity="success" @click="updateStatus(data, 'DONE')" /></template>
                    </Column>
                </DataTable>
            </div>
        </div>
    </AppLayout>
</template>
