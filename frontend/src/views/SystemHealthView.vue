<script setup lang="ts">
import {
    computed,
    onMounted,
    ref,
} from 'vue';

import Button
    from 'primevue/button';

import Column
    from 'primevue/column';

import DataTable
    from 'primevue/datatable';

import Dialog
    from 'primevue/dialog';

import InputText
    from 'primevue/inputtext';

import Message
    from 'primevue/message';

import Select
    from 'primevue/select';

import Tag
    from 'primevue/tag';

import CheckCircleIcon from '@primeicons/vue/check-circle';
import DownloadIcon from '@primeicons/vue/download';
import PauseCircleIcon from '@primeicons/vue/pause-circle';
import PencilIcon from '@primeicons/vue/pencil';
import PlayCircleIcon from '@primeicons/vue/play-circle';
import UploadIcon from '@primeicons/vue/upload';

import {
    useToast,
} from 'primevue/usetoast';

import AppLayout
    from '../layouts/AppLayout.vue';

import {
    labelFr,
    optionsFr,
} from '../i18n/labels';

import {
    getHealth,
    retryConnector,
} from '../services/health.service';

import {
    getSources,
    updateSource,
    updateSourceStatus,
    testConnector,
    updateConnector,
    runConnector,
    importManualSource,
    type Source,
} from '../services/sources.service';

import {
    buildConnectorConfig,
} from '../services/connector-config';

import {
    defaultSourceQuery,
} from '../utils/source-targeting';

import {
    useAuthStore,
} from '../stores/auth';

import {
    statusSeverity,
} from '../utils/status-severity';

const auth =
    useAuthStore();

const toast =
    useToast();

const health =
    ref<any>({
        connectors: [],
    });

const sources =
    ref<Source[]>([]);

const loading =
    ref(false);

const error =
    ref('');

const sourceSearch =
    ref('');

const busyId =
    ref<number | null>(null);

const editDialog =
    ref(false);

const editingSource =
    ref<Source | null>(null);

const editSubmitting =
    ref(false);

const editError =
    ref('');

const editQuery =
    ref('');

const importDialogVisible = ref(false);
const importSource = ref<Source | null>(null);
const importFile = ref<File | null>(null);
const importing = ref(false);
const importError = ref('');

const CROSSREF_API_URL =
    'https://api.crossref.org';

const categoryOptions = [
    'SCIENTIFIQUE',
    'REGLEMENTAIRE',
    'ACCREDITATION',
    'NORMATIF',
    'ENVIRONNEMENT',
    'AUTRE',
];

const editForm = ref({
    name: '',
    organization: '',
    country: '',
    category: '',
    sourceType: '',
    baseUrl: '',
    frequency: '',
    active: true,
});

const rows = computed(() =>
    sources.value.map(
        (source) => {
            const connector =
                source.connectors?.[0];

            const healthConnector =
                health.value.connectors
                    ?.find(
                        (item: any) =>
                            item.id ===
                            connector?.id,
                    );

            return {
                ...source,

                connector,

                connectorStatus:
                    connector
                        ? healthConnector
                            ?.status ??
                        connector.status
                        : source.sourceType ===
                            'IMPORT_MANUEL'
                            ? 'MANUAL'
                            : 'NOT_CONFIGURED',

                lastSyncAt:
                    healthConnector
                        ?.lastSyncAt ??
                    connector?.lastSyncAt ??
                    null,
            };
        },
    ),
);

const filteredRows = computed(() => {
    const query = sourceSearch.value.trim().toLocaleLowerCase('fr');
    if (!query) return rows.value;

    return rows.value.filter((source) =>
        [
            source.name,
            source.organization,
            source.country,
            labelFr(source.sourceType),
            labelFr(source.category),
            labelFr(source.connectorStatus),
        ].some((value) => String(value ?? '').toLocaleLowerCase('fr').includes(query)),
    );
});

function formatDate(
    value?: string | null,
) {
    if (!value) return 'Jamais';

    return new Intl.DateTimeFormat(
        'fr-FR',
        {
            dateStyle: 'short',
            timeStyle: 'short',
        },
    ).format(
        new Date(value),
    );
}

async function load() {
    loading.value = true;
    error.value = '';

    try {
        const [
            healthResponse,
            sourcesResponse,
        ] = await Promise.all([
            getHealth(),
            getSources(),
        ]);

        health.value =
            healthResponse.data;

        sources.value =
            sourcesResponse.data;
    } catch {
        error.value =
            'Impossible de charger les sources.';
    } finally {
        loading.value = false;
    }
}

async function test(
    connectorId: number,
) {
    busyId.value =
        connectorId;

    try {
        const response =
            await testConnector(
                connectorId,
            );

        toast.add({
            severity:
                response.data.success
                    ? 'success'
                    : 'error',

            summary:
                'Test du connecteur',

            detail:
                response.data.message,

            life: 5000,
        });

        await load();
    } finally {
        busyId.value =
            null;
    }
}

async function retry(
    connectorId: number,
) {
    busyId.value =
        connectorId;

    try {
        await retryConnector(
            connectorId,
        );

        toast.add({
            severity: 'success',
            summary:
                'Nouvelle tentative terminée',
            life: 4000,
        });

        await load();
    } finally {
        busyId.value =
            null;
    }
}

async function changeStatus(
    source: Source,
) {
    busyId.value =
        source.id;

    try {
        await updateSourceStatus(
            source.id,
            !source.active,
        );

        await load();
    } finally {
        busyId.value =
            null;
    }
}

function openEdit(
    source: Source,
) {
    if (!auth.isAdmin) return;

    editingSource.value =
        source;

    const connector =
        source.connectors?.[0];

    editForm.value = {
        name: source.name,
        organization:
            source.organization ?? '',
        country:
            source.country ?? '',
        category:
            source.category,
        sourceType:
            source.sourceType,

        baseUrl:
            source.sourceType === 'API'
                ? CROSSREF_API_URL
                : (
                    connector?.config
                        ?.feedUrl as string
                ) ??
                source.baseUrl ??
                '',

        frequency:
            source.frequency ?? '',

        active:
            source.active,
    };

    editQuery.value =
        (
            connector?.config
                ?.query as string
        ) ||
        defaultSourceQuery(
            source.category,
        );

    editError.value =
        '';

    editDialog.value =
        true;
}

async function submitEdit() {
    const source =
        editingSource.value;

    if (
        !source ||
        editSubmitting.value
    ) {
        return;
    }

    editSubmitting.value = true;
    editError.value = '';

    try {
        await updateSource(
            source.id,
            {
                name:
                    editForm.value.name
                        .trim(),

                organization:
                    editForm.value.organization
                        .trim() ||
                    undefined,

                country:
                    editForm.value.country
                        .trim() ||
                    undefined,

                category:
                    editForm.value.category,

                frequency:
                    editForm.value.frequency
                        .trim() ||
                    undefined,

                active:
                    editForm.value.active,
            },
        );

        const connector =
            source.connectors?.[0];

        if (
            connector &&
            source.sourceType !==
            'IMPORT_MANUEL'
        ) {
            const config =
                buildConnectorConfig(
                    source.sourceType,
                    editForm.value.baseUrl,
                    editQuery.value,
                );

            await updateConnector(
                connector.id,
                config,
            );
        }

        editDialog.value =
            false;

        await load();

        toast.add({
            severity: 'success',
            summary:
                'Source modifiée',
            life: 3000,
        });
    } catch (cause: any) {
        editError.value =
            cause.response?.data?.message ??
            cause.message ??
            'Modification impossible.';
    } finally {
        editSubmitting.value =
            false;
    }
}

async function collect(source: Source) {
    const connector = source.connectors?.[0];
    if (!connector || busyId.value !== null) return;

    busyId.value = connector.id;
    try {
        const result = (await runConnector(connector.id)).data;
        if ('message' in result) {
            toast.add({
                severity: 'info',
                summary: 'Collecte en cours',
                detail: result.message,
                life: 5000,
            });
        } else {
            toast.add({
                severity: result.errors ? 'warn' : 'success',
                summary: 'Collecte terminée',
                detail:
                    `${result.received} reçus · ${result.ignored} ignorés · ` +
                    `${result.created} nouveaux · ${result.updated} mis à jour · ` +
                    `${result.duplicates} doublons · ${result.errors} erreur(s)`,
                life: 10000,
            });
        }
        await load();
    } catch (cause: any) {
        toast.add({
            severity: 'error',
            summary: 'Collecte impossible',
            detail: cause.response?.data?.message ?? cause.message ?? 'La collecte a échoué.',
            life: 6000,
        });
    } finally {
        busyId.value = null;
    }
}

function openManualImport(source: Source) {
    importSource.value = source;
    importFile.value = null;
    importError.value = '';
    importDialogVisible.value = true;
}

function selectImportFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const selected = input.files?.[0] ?? null;
    importError.value = '';

    if (selected && selected.size > 5 * 1024 * 1024) {
        input.value = '';
        importFile.value = null;
        importError.value = 'Le fichier dépasse la taille maximale de 5 Mo.';
        return;
    }

    importFile.value = selected;
}

async function submitManualImport() {
    if (!importSource.value || !importFile.value || importing.value) return;

    importing.value = true;
    importError.value = '';
    try {
        const result = (await importManualSource(importSource.value.id, importFile.value)).data;
        importDialogVisible.value = false;
        toast.add({
            severity: result.errors ? 'warn' : 'success',
            summary: result.errors ? 'Import terminé avec erreurs' : 'Import terminé',
            detail:
                `${result.received} reçus · ${result.created} créés · ` +
                `${result.updated} mis à jour · ${result.duplicates} doublons · ` +
                `${result.errors} erreur(s)`,
            life: 10000,
        });
        await load();
    } catch (cause: any) {
        importError.value =
            cause.response?.data?.message ?? cause.message ?? 'Import impossible.';
    } finally {
        importing.value = false;
    }
}

onMounted(load);
</script>

<template>
    <AppLayout>
        <div class="space-y-5">
            <div>
                <h2 class="text-2xl font-bold">
                    Administration et santé des sources
                </h2>

                <p class="text-slate-600">
                    Configuration technique,
                    disponibilité et contrôle
                    des connecteurs.
                </p>
            </div>

            <Message v-if="error" severity="error">
                {{ error }}
            </Message>

            <div class="flex items-center gap-3 rounded-xl bg-white p-5 shadow-sm">
                <span class="font-semibold">
                    Base de données :
                </span>

                <Tag :value="labelFr(
                    health.database
                )
                    " :severity="health.database === 'UP'
                ? 'success'
                : 'danger'
            " />
            </div>

            <div class="rounded-xl bg-white p-5 shadow-sm">
                <div class="mb-4">
                    <InputText v-model="sourceSearch" class="w-full"
                        placeholder="Rechercher une source en temps réel..." />
                </div>

                <DataTable :value="filteredRows" :loading="loading" striped-rows>
                    <template #empty>Aucune source ne correspond à la recherche.</template>
                    <Column field="name" header="Source" />

                    <Column header="Type">
                        <template #body="{ data }">
                            {{
                                labelFr(
                                    data.sourceType
                            )
                            }}
                        </template>
                    </Column>

                    <Column header="Catégorie">
                        <template #body="{ data }">
                            {{
                                labelFr(
                                    data.category
                            )
                            }}
                        </template>
                    </Column>

                    <Column header="Statut">
                        <template #body="{ data }">
                            <div class="flex flex-col items-start gap-1">
                                <Tag :value="data.active
                                        ? 'Active'
                                        : 'Inactive'
                                    " :severity="data.active
                        ? 'success'
                        : 'secondary'
                    " />

                                <Tag v-if="data.connector" :value="labelFr(
                                    data.connectorStatus
                                )
                                    " :severity="statusSeverity(
                    data.connectorStatus
                )
                    " />
                            </div>
                        </template>
                    </Column>

                    <Column header="Dernière synchronisation">
                        <template #body="{ data }">
                            {{
                                formatDate(
                                    data.lastSyncAt
                            )
                            }}
                        </template>
                    </Column>

                    <Column header="Actions">
                        <template #body="{ data }">
                            <div class="flex flex-wrap gap-2">
                                <Button v-if="auth.isAdmin" aria-label="Modifier" title="Modifier la source"
                                    size="small" severity="secondary" rounded @click="openEdit(data)">
                                    <template #icon><PencilIcon size="0.9rem" /></template>
                                </Button>

                                <Button v-if="
                                    auth.isAdmin &&
                                    data.connector &&
                                    data.sourceType !==
                                    'IMPORT_MANUEL'
                                " aria-label="Tester" title="Tester le connecteur" size="small" severity="secondary"
                                    rounded :loading="busyId ===
                    data.connector.id
                    " @click="
                    test(
                        data.connector.id
                    )
                    ">
                                    <template #icon><CheckCircleIcon size="0.9rem" /></template>
                                </Button>

                                <Button v-if="data.active && data.sourceType !== 'IMPORT_MANUEL' && data.connector"
                                    label="Collecter" size="small" :loading="busyId === data.connector.id"
                                    @click="collect(data)">
                                    <template #icon><DownloadIcon size="0.85rem" /></template>
                                </Button>

                                <Button v-if="data.active && data.sourceType === 'IMPORT_MANUEL'"
                                    label="Importer" size="small" @click="openManualImport(data)">
                                    <template #icon><UploadIcon size="0.85rem" /></template>
                                </Button>

                                <Button v-if="
                                    data.connector &&
                                    data.connectorStatus ===
                                    'ERROR'
                                " label="Réessayer" size="small" :loading="busyId ===
                    data.connector.id
                    " @click="
                    retry(
                        data.connector.id
                    )
                    " />

                                <Button v-if="auth.isAdmin"
                                    :aria-label="data.active ? 'Désactiver' : 'Activer'"
                                    :title="data.active ? 'Désactiver la source' : 'Activer la source'"
                                    :severity="data.active
                        ? 'danger'
                        : 'success'
                    " size="small" rounded :loading="busyId ===
                    data.id
                    " @click="
                    changeStatus(data)
                    ">
                                    <template #icon>
                                        <PauseCircleIcon v-if="data.active" size="0.9rem" />
                                        <PlayCircleIcon v-else size="0.9rem" />
                                    </template>
                                </Button>
                            </div>
                        </template>
                    </Column>
                </DataTable>
            </div>

            <Dialog v-model:visible="importDialogVisible" modal header="Importer des éléments de veille"
                class="w-full max-w-xl" :closable="!importing" :close-on-escape="!importing">
                <form class="space-y-4" @submit.prevent="submitManualImport">
                    <p class="text-sm text-slate-600">
                        Source : <strong>{{ importSource?.name }}</strong>
                    </p>
                    <Message v-if="importError" severity="error">{{ importError }}</Message>
                    <Message severity="info">Formats acceptés : CSV et XLSX, 5 Mo maximum.</Message>
                    <div>
                        <label for="health-manual-import-file" class="required-label mb-2 block font-medium">
                            Fichier à importer
                        </label>
                        <input id="health-manual-import-file" type="file"
                            accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                            class="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                            :disabled="importing" required @change="selectImportFile" />
                    </div>
                    <div class="flex justify-end gap-3">
                        <Button type="button" label="Annuler" severity="secondary" :disabled="importing"
                            @click="importDialogVisible = false" />
                        <Button type="submit" label="Importer le fichier" :loading="importing"
                            :disabled="!importFile || importing">
                            <template #icon><UploadIcon size="0.9rem" /></template>
                        </Button>
                    </div>
                </form>
            </Dialog>

            <Dialog v-model:visible="editDialog
                " modal header="Modifier la source" class="w-full max-w-2xl">
                <form class="space-y-4" @submit.prevent="
                    submitEdit
                ">
                    <Message v-if="editError" severity="error">
                        {{ editError }}
                    </Message>

                    <div class="grid gap-4 md:grid-cols-2">
                        <div>
                            <label class="required-label mb-2 block">
                                Nom
                            </label>

                            <InputText v-model="editForm.name
                                " class="w-full" required />
                        </div>

                        <div>
                            <label class="mb-2 block">
                                Organisme
                            </label>

                            <InputText v-model="editForm.organization
                                " class="w-full" />
                        </div>

                        <div>
                            <label class="mb-2 block">
                                Pays
                            </label>

                            <InputText v-model="editForm.country
                                " class="w-full" />
                        </div>

                        <div>
                            <label class="mb-2 block">
                                Catégorie
                            </label>

                            <Select append-to="self" v-model="editForm.category
                                " :options="optionsFr(
                    categoryOptions
                )
                    " option-label="label" option-value="value" class="w-full" />
                        </div>

                        <div>
                            <label class="mb-2 block">
                                Fréquence
                            </label>

                            <InputText v-model="editForm.frequency
                                " class="w-full" />
                        </div>
                    </div>

                    <template v-if="
                        editForm.sourceType !==
                        'IMPORT_MANUEL'
                    ">
                        <div>
                            <label class="mb-2 block">
                                Adresse
                            </label>

                            <InputText v-model="editForm.baseUrl
                                " class="w-full" :disabled="editForm.sourceType ===
                    'API'
                    " />
                        </div>

                        <div>
                            <label class="mb-2 block">
                                Query / sujet ciblé
                            </label>

                            <InputText v-model="editQuery" class="w-full" />
                        </div>
                    </template>

                    <div class="flex justify-end gap-3">
                        <Button type="button" label="Annuler" severity="secondary" @click="
                            editDialog = false
                            " />

                        <Button type="submit" label="Enregistrer" :loading="editSubmitting
                            " />
                    </div>
                </form>
            </Dialog>
        </div>
    </AppLayout>
</template>
