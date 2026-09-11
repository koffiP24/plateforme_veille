<script setup lang="ts">
import { onMounted, ref } from 'vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import Message from 'primevue/message';
import Button from 'primevue/button';
import AppLayout from '../layouts/AppLayout.vue';
import { getWatchItems, type WatchItem } from '../services/watch-items.service';

const items = ref<WatchItem[]>([]);
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
                <h2 class="text-2xl font-bold">Éléments de veille</h2>
                <p class="text-slate-500">Informations collectées et normalisées.</p>
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
                    <Column field="watchType" header="Type" />
                    <Column header="Collecté le">
                        <template #body="{ data }">{{ formatDate(data.collectedAt) }}</template>
                    </Column>
                    <Column header="Statut">
                        <template #body="{ data }"><Tag :value="data.status" /></template>
                    </Column>
                </DataTable>
            </div>
        </div>
    </AppLayout>
</template>
