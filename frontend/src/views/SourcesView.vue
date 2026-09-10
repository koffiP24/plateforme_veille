<script setup lang="ts">
import {
    onMounted,
    ref,
} from 'vue';

import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import Tag from 'primevue/tag';
import Message from 'primevue/message';

import AppLayout from '../layouts/AppLayout.vue';

import {
    createSource,
    updateSourceStatus,
    getSources,
    testConnector,
    runConnector,
    type Source,
} from '../services/sources.service';

const sources = ref<Source[]>([]);
const loading = ref(false);

const dialogVisible = ref(false);
const error = ref('');
const statusError = ref('');
const changingStatus = ref<number[]>([]);
const busyConnectors = ref<number[]>([]);

const categoryOptions = [
    'SCIENTIFIQUE',
    'REGLEMENTAIRE',
    'ACCREDITATION',
    'NORMATIF',
    'ENVIRONNEMENT',
    'AUTRE',
];

const sourceTypeOptions = [
    'API',
    'RSS',
    'ATOM',
    'IMPORT_MANUEL',
];

const form = ref({
    name: '',
    organization: '',
    country: '',
    category: '',
    sourceType: '',
    baseUrl: '',
    frequency: '',
    active: true,
});

async function loadSources() {
    loading.value = true;

    try {
        const response =
            await getSources();

        sources.value =
            response.data;
    } finally {
        loading.value = false;
    }
}

async function submit() {
    error.value = '';

    try {
        await createSource(
            form.value,
        );

        dialogVisible.value = false;

        form.value = {
            name: '',
            organization: '',
            country: '',
            category: '',
            sourceType: '',
            baseUrl: '',
            frequency: '',
            active: true,
        };

        await loadSources();
    } catch (err: any) {
        error.value =
            err.response?.data?.message ??
            'Création impossible';
    }
}

async function changeStatus(id: number, active: boolean) {
    if (changingStatus.value.includes(id)) return;
    statusError.value = '';
    changingStatus.value.push(id);
    try {
        const response = await updateSourceStatus(id, active);
        const source = sources.value.find((item) => item.id === id);
        if (source) source.active = response.data.active;
    } catch {
        statusError.value = 'Impossible de modifier le statut de la source. Réessaie.';
    } finally {
        changingStatus.value = changingStatus.value.filter((item) => item !== id);
    }
}

async function test(connectorId: number) {
    if (busyConnectors.value.includes(connectorId)) return;
    busyConnectors.value.push(connectorId);
    try {
        const response = await testConnector(connectorId);
        alert(response.data.message);
        await loadSources();
    } catch {
        alert('Échec du test du connecteur.');
    } finally {
        busyConnectors.value = busyConnectors.value.filter((id) => id !== connectorId);
    }
}

async function run(connectorId: number) {
    if (busyConnectors.value.includes(connectorId)) return;
    busyConnectors.value.push(connectorId);
    try {
        const response = await runConnector(connectorId);
        alert(`${response.data.count} élément(s) récupéré(s).`);
        await loadSources();
    } catch {
        alert('La collecte a échoué.');
    } finally {
        busyConnectors.value = busyConnectors.value.filter((id) => id !== connectorId);
    }
}

onMounted(loadSources);
</script>

<template>
    <AppLayout>
        <div class="space-y-6">
            <div class="flex items-center justify-between">
                <div>
                    <h2 class="text-2xl font-bold">
                        Sources
                    </h2>

                    <p class="text-slate-500">
                        Référentiel des sources
                        de veille.
                    </p>
                </div>

                <Button label="Ajouter une source" icon="pi pi-plus" @click="
                    dialogVisible = true
                    " />
            </div>

            <Message v-if="statusError" severity="error">{{ statusError }}</Message>

            <div class="rounded-xl bg-white p-5 shadow-sm">
                <DataTable :value="sources" :loading="loading" paginator :rows="10">
                    <Column field="name" header="Nom" />

                    <Column field="organization" header="Organisme" />

                    <Column field="category" header="Catégorie" />

                    <Column field="sourceType" header="Type" />

                    <Column field="frequency" header="Fréquence" />

                    <Column header="Statut">
                        <template #body="{ data }">
                            <Tag :value="data.active
                                    ? 'Active'
                                    : 'Inactive'
                                " :severity="data.active
                        ? 'success'
                        : 'secondary'
                    " />
                        </template>
                    </Column>

                    <Column header="Actions">
                        <template #body="{ data }">
                            <div class="flex flex-wrap gap-2">
                            <Button v-if="data.connectors?.length" label="Tester" size="small" severity="secondary"
                                :disabled="busyConnectors.includes(data.connectors[0].id)"
                                @click="test(data.connectors[0].id)" />
                            <Button v-if="data.active && data.connectors?.length" label="Collecter" size="small"
                                :disabled="busyConnectors.includes(data.connectors[0].id)"
                                @click="run(data.connectors[0].id)" />
                            <Button v-if="data.active" label="Désactiver" severity="danger" size="small"
                                :loading="changingStatus.includes(data.id)"
                                :disabled="changingStatus.includes(data.id)"
                                @click="changeStatus(data.id, false)" />
                            <Button v-else label="Réactiver" severity="success" size="small"
                                :loading="changingStatus.includes(data.id)"
                                :disabled="changingStatus.includes(data.id)"
                                @click="changeStatus(data.id, true)" />
                            </div>
                        </template>
                    </Column>
                </DataTable>
            </div>

            <Dialog v-model:visible="dialogVisible
                " modal header="Nouvelle source" class="w-full max-w-2xl">
                <form class="space-y-4" @submit.prevent="submit">
                    <Message v-if="error" severity="error">
                        {{ error }}
                    </Message>

                    <div class="grid gap-4 md:grid-cols-2">
                        <div>
                            <label class="mb-2 block">
                                Nom
                            </label>

                            <InputText v-model="form.name" class="w-full" />
                        </div>

                        <div>
                            <label class="mb-2 block">
                                Organisme
                            </label>

                            <InputText v-model="form.organization
                                " class="w-full" />
                        </div>

                        <div>
                            <label class="mb-2 block">
                                Pays
                            </label>

                            <InputText v-model="form.country
                                " class="w-full" />
                        </div>

                        <div>
                            <label class="mb-2 block">
                                Catégorie
                            </label>

                            <Select v-model="form.category
                                " :options="categoryOptions
                    " class="w-full" />
                        </div>

                        <div>
                            <label class="mb-2 block">
                                Type
                            </label>

                            <Select v-model="form.sourceType
                                " :options="sourceTypeOptions
                    " class="w-full" />
                        </div>

                        <div>
                            <label class="mb-2 block">
                                Fréquence
                            </label>

                            <InputText v-model="form.frequency
                                " class="w-full" placeholder="6h" />
                        </div>
                    </div>

                    <div>
                        <label class="mb-2 block">
                            URL
                        </label>

                        <InputText v-model="form.baseUrl
                            " class="w-full" />
                    </div>

                    <div class="flex justify-end gap-3">
                        <Button type="button" label="Annuler" severity="secondary" @click="
                            dialogVisible = false
                            " />

                        <Button type="submit" label="Créer" />
                    </div>
                </form>
            </Dialog>
        </div>
    </AppLayout>
</template>
