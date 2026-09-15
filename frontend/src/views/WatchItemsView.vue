<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import Message from 'primevue/message';
import Button from 'primevue/button';
import { labelFr } from '../i18n/labels';
import AppLayout from '../layouts/AppLayout.vue';
import { getWatchItems, type WatchItem } from '../services/watch-items.service';



const items = ref<WatchItem[]>([]);
const router = useRouter();
const auth = useAuthStore();
const canQualify = computed(() => {
    const roles = auth.user?.roles ?? [];

    return (
        roles.includes('ADMIN') ||
        roles.includes('RESPONSABLE_VEILLE') ||
        roles.includes('OPERATEUR_VEILLE')
    );
});
const loading = ref(false);
const error = ref('');
const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short', timeStyle: 'short',
});

function formatDate(value: string | null) {
    if (!value) return 'Non renseignée';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Non renseignée' : dateFormatter.format(date);
}

async function load() {
    loading.value = true;
    error.value = '';
    try {
        const response = await getWatchItems();
        items.value = response.data;
    } catch {
        error.value = 'Impossible de charger les éléments de veille. Réessaie.';
    } finally {
        loading.value = false;
    }
}

onMounted(load);
</script>

<template>
    <AppLayout>
        <div class="space-y-6">
            <div>
                <h2 class="text-2xl font-bold text-slate-900">Éléments de veille</h2>
                <p class="text-slate-700">Informations collectées et normalisées.</p>
            </div>
            <Message v-if="error" severity="error">
                {{ error }}
                <Button label="Réessayer" size="small" severity="secondary" :disabled="loading" @click="load" />
            </Message>
            <div class="rounded-xl bg-white p-5 shadow-sm">
                <DataTable :value="items" :loading="loading" data-key="id" paginator :rows="10">
                    <template #empty>{{ error ? 'Liste indisponible.' : 'Aucun élément de veille collecté pour le moment.' }}</template>
                    <Column field="title" header="Titre" />
                    <Column header="Source">
                        <template #body="{ data }">{{ data.source?.name ?? 'Non renseignée' }}</template>
                    </Column>
                    <Column header="Type">
                        <template #body="{ data }">{{ labelFr(data.watchType) }}</template>
                    </Column>
                    <Column header="Collecté le">
                        <template #body="{ data }">{{ formatDate(data.collectedAt) }}</template>
                    </Column>
                    <Column header="Statut">
                        <template #body="{ data }"><Tag :value="labelFr(data.status)" /></template>
                    </Column>
                    <Column v-if="canQualify" header="Actions">
                        <template #body="{ data }">
                            <Button v-if="canQualify && ['NOUVEAU', 'A_QUALIFIER'].includes(data.status)"
                                label="Qualifier" size="small"
                                @click="router.push(`/watch-items/${data.id}/qualification`)" />
                        </template>
                    </Column>
                </DataTable>
            </div>
        </div>
    </AppLayout>
</template>
