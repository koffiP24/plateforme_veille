<script setup lang="ts">
import {
    computed,
    onMounted,
    ref,
} from 'vue';

import Button from 'primevue/button';
import { useToast } from 'primevue/usetoast';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import Tag from 'primevue/tag';
import Message from 'primevue/message';
import Checkbox from 'primevue/checkbox';
import { isAxiosError } from 'axios';
import { buildConnectorConfig } from '../services/connector-config';

import AppLayout from '../layouts/AppLayout.vue';
import { useAuthStore } from '../stores/auth';

import {
    createSource,
    createConnector,
    updateSourceStatus,
    getSources,
    testConnector,
    runConnector,
    type Source,
} from '../services/sources.service';

const auth = useAuthStore();
const canCreateSource = computed(() => {
    const roles = auth.user?.roles ?? [];
    return roles.includes('ADMIN') || roles.includes('OPERATEUR_VEILLE');
});
const canChangeStatus = computed(() => Boolean(auth.isAdmin));
const canTestConnector = computed(() => Boolean(auth.isAdmin));
const canRunConnector = computed(() => {
    const roles = auth.user?.roles ?? [];
    return roles.includes('ADMIN') || roles.includes('RESPONSABLE_VEILLE');
});

const sources = ref<Source[]>([]);
const loading = ref(false);

const dialogVisible = ref(false);
const error = ref('');
const statusError = ref('');
const changingStatus = ref<number[]>([]);
const busyConnectors = ref<number[]>([]);
const collectingConnectors = ref<number[]>([]);
const createWithConnector = ref(true);
const submitting = ref(false);
const crossrefQuery = ref('');
const connectorDialog = ref(false);
const selectedSource = ref<Source | null>(null);
const connectorUrl = ref('');
const connectorQuery = ref('');
const connectorError = ref('');
const savingConnector = ref(false);
const toast = useToast();

const connectorStatusLabels: Record<string, string> = {
    NOT_TESTED: 'Non testé',
    AVAILABLE: 'Disponible',
    RUNNING: 'Collecte en cours',
    ERROR: 'En erreur',
};

function formatFrequency(frequency: string | null): string {
    return frequency?.trim().toLowerCase().replace(/^(\d+)d$/, '$1j') || 'Non définie';
}

function errorMessage(err: unknown): string {
    if (isAxiosError(err)) {
        const message = err.response?.data?.message;
        if (Array.isArray(message)) return message.join(' ');
        if (typeof message === 'string') return message;
    }
    return err instanceof Error ? err.message : 'Une erreur est survenue.';
}

function configure(source: Source) {
    if (!auth.isAdmin) return;
    selectedSource.value = source;
    connectorUrl.value = source.baseUrl ?? '';
    connectorQuery.value = '';
    connectorError.value = '';
    connectorDialog.value = true;
}

async function saveConnector() {
    if (!auth.isAdmin || !selectedSource.value || savingConnector.value) return;
    savingConnector.value = true;
    connectorError.value = '';
    try {
        const source = selectedSource.value;
        const config = buildConnectorConfig(source.sourceType, connectorUrl.value, connectorQuery.value);
        // Rafraîchir avant de créer pour éviter un doublon après une réponse perdue.
        await loadSources();
        if (!sources.value.find((item) => item.id === source.id)?.connectors?.length) {
            await createConnector(source.id, source.sourceType, config);
        }
        connectorDialog.value = false;
        await loadSources();
    } catch (err: unknown) {
        connectorError.value = errorMessage(err);
        if (!connectorDialog.value) statusError.value = 'Connecteur créé, mais actualisation impossible. Rechargez la page.';
    } finally {
        savingConnector.value = false;
    }
}

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
    if (!canCreateSource.value || submitting.value) return;
    error.value = '';
    statusError.value = '';
    submitting.value = true;

    try {
        const config = auth.isAdmin && createWithConnector.value
            ? buildConnectorConfig(form.value.sourceType, form.value.baseUrl, crossrefQuery.value)
            : null;
        const response = await createSource({
            ...form.value,
            baseUrl: form.value.baseUrl.trim() || undefined,
        });

        dialogVisible.value = false;

        if (config) {
            try {
                await createConnector(response.data.id, response.data.sourceType, config);
            } catch (err: unknown) {
                statusError.value = `Source créée (#${response.data.id}), mais connecteur non confirmé : ${errorMessage(err)} Utilisez « Configurer » après actualisation.`;
            }
        }
        crossrefQuery.value = '';

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
    } catch (err: unknown) {
        if (dialogVisible.value) error.value = errorMessage(err);
        else statusError.value = 'Source créée, mais actualisation impossible. Rechargez la page.';
    } finally {
        submitting.value = false;
    }
}

async function changeStatus(id: number, active: boolean) {
    if (!canChangeStatus.value) return;
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
    if (!canTestConnector.value) return;
    if (busyConnectors.value.includes(connectorId)) return;
    busyConnectors.value.push(connectorId);
    try {
        const response = await testConnector(connectorId);
        toast.add({
            severity: response.data.success ? 'success' : 'error',
            summary: 'Résultat du test du connecteur',
            detail: response.data.message,
            life: 8000,
        });
        try {
            await loadSources();
        } catch {
            statusError.value = 'Impossible d’actualiser les sources. Rechargez la page.';
        }
    } catch {
        toast.add({ severity: 'error', summary: 'Test échoué', detail: 'Échec du test du connecteur.', life: 8000 });
    } finally {
        busyConnectors.value = busyConnectors.value.filter((id) => id !== connectorId);
    }
}

async function run(connectorId: number) {
    if (!canRunConnector.value) return;
    if (busyConnectors.value.includes(connectorId)) return;
    busyConnectors.value.push(connectorId);
    collectingConnectors.value.push(connectorId);
    try {
        const response = await runConnector(connectorId);
        const result = response.data;
        if ('message' in result) {
            toast.add({ severity: 'info', summary: 'Collecte en cours', detail: result.message, life: 8000 });
        } else {
            toast.add({
                severity: result.errors > 0 ? 'warn' : 'success',
                summary: result.errors > 0 ? 'Collecte terminée avec erreurs' : 'Collecte terminée',
                detail: `${result.received} reçus\n${result.created} nouveaux\n` +
                    `${result.updated} mis à jour\n${result.duplicates} doublons\n${result.errors} erreur(s)`,
                life: 12000,
            });
        }
        try {
            await loadSources();
        } catch {
            statusError.value = 'Impossible d’actualiser les sources. Rechargez la page.';
        }
    } catch {
        toast.add({ severity: 'error', summary: 'Collecte échouée', detail: 'La collecte a échoué.', life: 8000 });
    } finally {
        collectingConnectors.value = collectingConnectors.value.filter((id) => id !== connectorId);
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

                <Button v-if="canCreateSource" label="Ajouter une source" icon="pi pi-plus" @click="
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

                    <Column header="Fréquence">
                        <template #body="{ data }">
                            {{ formatFrequency(data.frequency) }}
                        </template>
                    </Column>

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

                    <Column header="Collecte">
                        <template #body="{ data }">
                            <span v-if="!data.connectors?.length" class="text-slate-500">
                                {{ auth.isAdmin ? 'Connecteur à configurer' : 'Configuration requise par un administrateur' }}
                            </span>
                            <span v-else>{{ connectorStatusLabels[data.connectors[0].status] ?? 'Statut inconnu' }}</span>
                        </template>
                    </Column>

                    <Column v-if="canChangeStatus || canTestConnector || canRunConnector" header="Actions">
                        <template #body="{ data }">
                            <div class="flex flex-wrap gap-2">
                                <Button v-if="auth.isAdmin && !data.connectors?.length" label="Configurer"
                                    severity="secondary" size="small" @click="configure(data)" />
                                <Button v-if="canTestConnector && data.connectors?.length" label="Tester" size="small"
                                    severity="secondary" :disabled="busyConnectors.includes(data.connectors[0].id)"
                                    @click="test(data.connectors[0].id)" />
                                <Button v-if="canRunConnector && data.active && data.connectors?.length"
                                    :label="collectingConnectors.includes(data.connectors[0].id) ? 'Collecte en cours…' : 'Collecter'" size="small"
                                    :loading="collectingConnectors.includes(data.connectors[0].id)"
                                    :disabled="busyConnectors.includes(data.connectors[0].id)"
                                    @click="run(data.connectors[0].id)" />
                                <Button v-if="canChangeStatus && data.active" label="Désactiver" severity="danger"
                                    size="small" :loading="changingStatus.includes(data.id)"
                                    :disabled="changingStatus.includes(data.id)"
                                    @click="changeStatus(data.id, false)" />
                                <Button v-if="canChangeStatus && !data.active" label="Réactiver" severity="success"
                                    size="small" :loading="changingStatus.includes(data.id)"
                                    :disabled="changingStatus.includes(data.id)" @click="changeStatus(data.id, true)" />
                            </div>
                        </template>
                    </Column>
                </DataTable>
            </div>

            <Dialog v-if="auth.isAdmin" v-model:visible="connectorDialog" modal header="Configurer la collecte"
                class="w-full max-w-xl" :closable="!savingConnector" :close-on-escape="!savingConnector">
                <form class="space-y-4" @submit.prevent="saveConnector">
                    <p>{{ selectedSource?.name }} — {{ selectedSource?.sourceType }}</p>
                    <Message v-if="connectorError" severity="error">{{ connectorError }}</Message>
                    <Message v-if="selectedSource?.sourceType === 'API'" severity="info">API disponible : Crossref. URL
                        :
                        https://api.crossref.org</Message>
                    <Message v-if="selectedSource?.sourceType === 'IMPORT_MANUEL'" severity="info">Ce connecteur de test
                        ne récupère
                        aucun élément sur Internet.</Message>
                    <div v-if="selectedSource?.sourceType !== 'IMPORT_MANUEL'">
                        <label for="connector-url" class="mb-2 block">URL du flux RSS/Atom ou de l’API Crossref</label>
                        <InputText id="connector-url" v-model="connectorUrl" class="w-full" required
                            :disabled="savingConnector" />
                    </div>
                    <div v-if="selectedSource?.sourceType === 'API'">
                        <label for="connector-query" class="mb-2 block">Recherche Crossref (facultative, 10
                            résultats)</label>
                        <InputText id="connector-query" v-model="connectorQuery" class="w-full"
                            :disabled="savingConnector" />
                    </div>
                    <Button type="submit" label="Enregistrer le connecteur" :loading="savingConnector"
                        :disabled="savingConnector" />
                </form>
            </Dialog>

            <Dialog v-if="canCreateSource" v-model:visible="dialogVisible
                " modal header="Nouvelle source" class="w-full max-w-2xl" :closable="!submitting" :close-on-escape="!submitting">
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
                                " class="w-full" placeholder="Ex. : 30m, 6h ou 1j" />
                            <p class="mt-1 text-sm text-slate-500">m : minutes · h : heures · j : jours</p>
                        </div>
                    </div>

                    <div>
                        <label class="mb-2 block">
                            URL
                        </label>

                        <InputText v-model="form.baseUrl
                            " class="w-full" />
                    </div>

                    <div v-if="auth.isAdmin" class="space-y-3">
                        <div class="flex items-center gap-2">
                            <Checkbox v-model="createWithConnector" input-id="with-connector" binary />
                            <label for="with-connector">Créer aussi le connecteur de collecte</label>
                        </div>
                        <p v-if="createWithConnector && ['RSS', 'ATOM'].includes(form.sourceType)"
                            class="text-sm text-slate-500">
                            L’URL ci-dessus doit être celle du flux RSS/Atom, pas celle de la page d’accueil.
                        </p>
                        <div v-if="createWithConnector && form.sourceType === 'API'">
                            <p class="mb-2 text-sm text-slate-500">API prise en charge : Crossref
                                (https://api.crossref.org), 10
                                résultats.</p>
                            <label for="source-query" class="mb-2 block">Recherche Crossref (facultative)</label>
                            <InputText id="source-query" v-model="crossrefQuery" class="w-full" />
                        </div>
                    </div>
                    <Message v-else severity="info">Un administrateur devra configurer le connecteur pour permettre la
                        collecte.
                    </Message>

                    <div class="flex justify-end gap-3">
                        <Button type="button" label="Annuler" severity="secondary" :disabled="submitting" @click="
                            dialogVisible = false
                            " />

                        <Button type="submit" label="Créer" :loading="submitting" :disabled="submitting" />
                    </div>
                </form>
            </Dialog>
        </div>
    </AppLayout>
</template>
