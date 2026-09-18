<script setup lang="ts">
import {
    onMounted,
    ref,
} from 'vue';

import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Dialog from 'primevue/dialog';
import InputNumber from 'primevue/inputnumber';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import Select from 'primevue/select';
import Tab from 'primevue/tab';
import TabList from 'primevue/tablist';
import TabPanel from 'primevue/tabpanel';
import TabPanels from 'primevue/tabpanels';
import Tabs from 'primevue/tabs';
import Tag from 'primevue/tag';
import Textarea from 'primevue/textarea';

import AppLayout
    from '../layouts/AppLayout.vue';

import {
    createDomain,
    createKeyword,
    createLaboratory,
    createTopic,
    getDomains,
    getKeywords,
    getLaboratories,
    getTopics,

    type Domain,
    type Keyword,
    type Laboratory,
    type Topic,
} from '../services/taxonomy.service';

const topics =
    ref<Topic[]>([]);

const domains =
    ref<Domain[]>([]);

const laboratories =
    ref<Laboratory[]>([]);

const keywords =
    ref<Keyword[]>([]);

const loading =
    ref(false);

const error =
    ref('');

const topicDialog =
    ref(false);

const domainDialog =
    ref(false);

const laboratoryDialog =
    ref(false);

const keywordDialog =
    ref(false);

const topicForm =
    ref({
        label: '',
        description: '',
        parentId:
            null as number | null,
    });

const domainForm =
    ref({
        name: '',
        description: '',
        active: true,
    });

const laboratoryForm =
    ref({
        name: '',
        description: '',
        active: true,
    });

const keywordForm =
    ref({
        label: '',
        weight: 1,
        active: true,
    });

async function loadAll() {
    loading.value = true;
    error.value = '';

    try {
        const [
            topicsResponse,
            domainsResponse,
            laboratoriesResponse,
            keywordsResponse,
        ] = await Promise.all([
            getTopics(),
            getDomains(),
            getLaboratories(),
            getKeywords(),
        ]);

        topics.value =
            topicsResponse.data;

        domains.value =
            domainsResponse.data;

        laboratories.value =
            laboratoriesResponse.data;

        keywords.value =
            keywordsResponse.data;
    } catch (err: any) {
        error.value =
            err.response?.data?.message ??
            'Impossible de charger la taxonomie.';
    } finally {
        loading.value = false;
    }
}

async function submitTopic() {
    error.value = '';

    try {
        await createTopic({
            label:
                topicForm.value.label,

            description:
                topicForm.value.description
                || undefined,

            parentId:
                topicForm.value.parentId,
        });

        topicDialog.value =
            false;

        topicForm.value = {
            label: '',
            description: '',
            parentId: null,
        };

        await loadAll();
    } catch (err: any) {
        error.value =
            err.response?.data?.message ??
            'Création du thème impossible.';
    }
}

async function submitDomain() {
    error.value = '';

    try {
        await createDomain(
            domainForm.value,
        );

        domainDialog.value =
            false;

        domainForm.value = {
            name: '',
            description: '',
            active: true,
        };

        await loadAll();
    } catch (err: any) {
        error.value =
            err.response?.data?.message ??
            'Création du domaine impossible.';
    }
}

async function submitLaboratory() {
    error.value = '';

    try {
        await createLaboratory(
            laboratoryForm.value,
        );

        laboratoryDialog.value =
            false;

        laboratoryForm.value = {
            name: '',
            description: '',
            active: true,
        };

        await loadAll();
    } catch (err: any) {
        error.value =
            err.response?.data?.message ??
            'Création du laboratoire impossible.';
    }
}

async function submitKeyword() {
    error.value = '';

    try {
        await createKeyword(
            keywordForm.value,
        );

        keywordDialog.value =
            false;

        keywordForm.value = {
            label: '',
            weight: 1,
            active: true,
        };

        await loadAll();
    } catch (err: any) {
        error.value =
            err.response?.data?.message ??
            'Création du mot-clé impossible.';
    }
}

onMounted(loadAll);
</script>

<template>
    <AppLayout>
        <div class="space-y-6">
            <div>
                <h2 class="text-2xl font-bold text-slate-900">
                    Taxonomie
                </h2>

                <p class="text-slate-700">
                    Gestion des thèmes,
                    domaines, laboratoires
                    et mots-clés.
                </p>
            </div>

            <Message v-if="error" severity="error">
                {{ error }}
            </Message>

            <Tabs value="topics">
                <TabList>
                    <Tab value="topics">
                        Thèmes
                    </Tab>

                    <Tab value="domains">
                        Domaines
                    </Tab>

                    <Tab value="laboratories">
                        Laboratoires
                    </Tab>

                    <Tab value="keywords">
                        Mots-clés
                    </Tab>
                </TabList>

                <TabPanels>
                    <TabPanel value="topics">
                        <div class="space-y-4 pt-4">
                            <div class="flex justify-end">
                                <Button label="Ajouter un thème" icon="pi pi-plus" @click="
                                    topicDialog = true
                                    " />
                            </div>

                            <DataTable :value="topics" :loading="loading" paginator :rows="10">
                                <Column field="label" header="Libellé" />

                                <Column field="description" header="Description" />

                                <Column header="Parent">
                                    <template #body="{ data }">
                                        {{
                                            data.parent
                                                ?.label ??
                                        '-'
                                        }}
                                    </template>
                                </Column>
                            </DataTable>
                        </div>
                    </TabPanel>

                    <TabPanel value="domains">
                        <div class="space-y-4 pt-4">
                            <div class="flex justify-end">
                                <Button label="Ajouter un domaine" icon="pi pi-plus" @click="
                                    domainDialog = true
                                    " />
                            </div>

                            <DataTable :value="domains" :loading="loading" paginator :rows="10">
                                <Column field="name" header="Nom" />

                                <Column field="description" header="Description" />

                                <Column header="Statut">
                                    <template #body="{ data }">
                                        <Tag :value="data.active
                                                ? 'Actif'
                                                : 'Inactif'
                                            " :severity="data.active
                            ? 'success'
                            : 'secondary'
                        " />
                                    </template>
                                </Column>
                            </DataTable>
                        </div>
                    </TabPanel>

                    <TabPanel value="laboratories">
                        <div class="space-y-4 pt-4">
                            <div class="flex justify-end">
                                <Button label="Ajouter un laboratoire" icon="pi pi-plus" @click="
                                    laboratoryDialog =
                                    true
                                    " />
                            </div>

                            <DataTable :value="laboratories" :loading="loading" paginator :rows="10">
                                <Column field="name" header="Nom" />

                                <Column field="description" header="Description" />

                                <Column header="Statut">
                                    <template #body="{ data }">
                                        <Tag :value="data.active
                                                ? 'Actif'
                                                : 'Inactif'
                                            " :severity="data.active
                            ? 'success'
                            : 'secondary'
                        " />
                                    </template>
                                </Column>
                            </DataTable>
                        </div>
                    </TabPanel>

                    <TabPanel value="keywords">
                        <div class="space-y-4 pt-4">
                            <div class="flex justify-end">
                                <Button label="Ajouter un mot-clé" icon="pi pi-plus" @click="
                                    keywordDialog = true
                                    " />
                            </div>

                            <DataTable :value="keywords" :loading="loading" paginator :rows="10">
                                <Column field="label" header="Mot-clé" />

                                <Column field="weight" header="Poids" />

                                <Column header="Statut">
                                    <template #body="{ data }">
                                        <Tag :value="data.active
                                                ? 'Actif'
                                                : 'Inactif'
                                            " :severity="data.active
                            ? 'success'
                            : 'secondary'
                        " />
                                    </template>
                                </Column>
                            </DataTable>
                        </div>
                    </TabPanel>
                </TabPanels>
            </Tabs>

            <Dialog v-model:visible="topicDialog
                " modal header="Nouveau thème" class="w-full max-w-xl">
                <form class="space-y-4" @submit.prevent="
                    submitTopic
                ">
                    <div>
                        <label class="mb-2 block">
                            Libellé
                        </label>

                        <InputText v-model="topicForm.label
                            " class="w-full" required />
                    </div>

                    <div>
                        <label class="mb-2 block">
                            Description
                        </label>

                        <Textarea v-model="topicForm.description
                            " class="w-full" rows="4" />
                    </div>

                    <div>
                        <label class="mb-2 block">
                            Thème parent
                        </label>

                        <Select v-model="topicForm.parentId
                            " :options="topics" option-label="label" option-value="id" show-clear placeholder="Aucun"
                            class="w-full" />
                    </div>

                    <div class="flex justify-end gap-3">
                        <Button type="button" label="Annuler" severity="secondary" @click="
                            topicDialog = false
                            " />

                        <Button type="submit" label="Créer" />
                    </div>
                </form>
            </Dialog>

            <Dialog v-model:visible="domainDialog
                " modal header="Nouveau domaine" class="w-full max-w-xl">
                <form class="space-y-4" @submit.prevent="
                    submitDomain
                ">
                    <div>
                        <label class="mb-2 block">
                            Nom
                        </label>

                        <InputText v-model="domainForm.name
                            " class="w-full" required />
                    </div>

                    <div>
                        <label class="mb-2 block">
                            Description
                        </label>

                        <Textarea v-model="domainForm.description
                            " class="w-full" rows="4" />
                    </div>

                    <div class="flex justify-end gap-3">
                        <Button type="button" label="Annuler" severity="secondary" @click="
                            domainDialog = false
                            " />

                        <Button type="submit" label="Créer" />
                    </div>
                </form>
            </Dialog>

            <Dialog v-model:visible="laboratoryDialog
                " modal header="Nouveau laboratoire" class="w-full max-w-xl">
                <form class="space-y-4" @submit.prevent="
                    submitLaboratory
                ">
                    <div>
                        <label class="mb-2 block">
                            Nom
                        </label>

                        <InputText v-model="laboratoryForm.name
                            " class="w-full" required />
                    </div>

                    <div>
                        <label class="mb-2 block">
                            Description
                        </label>

                        <Textarea v-model="laboratoryForm.description
                            " class="w-full" rows="4" />
                    </div>

                    <div class="flex justify-end gap-3">
                        <Button type="button" label="Annuler" severity="secondary" @click="
                            laboratoryDialog =
                            false
                            " />

                        <Button type="submit" label="Créer" />
                    </div>
                </form>
            </Dialog>

            <Dialog v-model:visible="keywordDialog
                " modal header="Nouveau mot-clé" class="w-full max-w-xl">
                <form class="space-y-4" @submit.prevent="
                    submitKeyword
                ">
                    <div>
                        <label class="mb-2 block">
                            Libellé
                        </label>

                        <InputText v-model="keywordForm.label
                            " class="w-full" required />
                    </div>

                    <div>
                        <label class="mb-2 block">
                            Poids
                        </label>

                        <InputNumber v-model="keywordForm.weight
                            " :min="0" :max="100" :min-fraction-digits="0" :max-fraction-digits="2" class="w-full" />
                    </div>

                    <div class="flex justify-end gap-3">
                        <Button type="button" label="Annuler" severity="secondary" @click="
                            keywordDialog = false
                            " />

                        <Button type="submit" label="Créer" />
                    </div>
                </form>
            </Dialog>
        </div>
    </AppLayout>
</template>
