<script setup lang="ts">
import { labelFr, optionsFr } from '../i18n/labels';
import {
    computed,
    onMounted,
    ref,
} from 'vue';

import {
    useRoute,
    useRouter,
} from 'vue-router';

import Button
    from 'primevue/button';

import Card
    from 'primevue/card';

import InputNumber
    from 'primevue/inputnumber';

import Message
    from 'primevue/message';

import MultiSelect
    from 'primevue/multiselect';

import Select
    from 'primevue/select';

import Tag
    from 'primevue/tag';

import AppLayout
    from '../layouts/AppLayout.vue';

import {
    getWatchItem,
    type WatchItem,
} from '../services/watch-items.service';

import {
    getDomains,
    getKeywords,
    getLaboratories,
    getTopics,

    type Domain,
    type Keyword,
    type Laboratory,
    type Topic,
} from '../services/taxonomy.service';

import {
    qualifyWatchItem,
    getQualification,
} from '../services/qualification.service';

const route =
    useRoute();

const router =
    useRouter();

const item =
    ref<WatchItem | null>(
        null,
    );

const topics =
    ref<Topic[]>([]);

const keywords =
    ref<Keyword[]>([]);

const domains =
    ref<Domain[]>([]);

const laboratories =
    ref<Laboratory[]>([]);

const loading =
    ref(false);

const saving =
    ref(false);

const error =
    ref('');

const success =
    ref('');

const watchTypeOptions = [
    'SCIENTIFIQUE',
    'REGLEMENTAIRE',
    'ACCREDITATION',
    'NORMATIF',
    'ENVIRONNEMENT',
    'AUTRE',
];

const criticalityOptions = [
    'FAIBLE',
    'MOYENNE',
    'ELEVEE',
    'CRITIQUE',
];

const form =
    ref({
        watchType: '',

        relevance:
            null as number | null,

        criticality:
            null as string | null,

        topicIds:
            [] as number[],

        keywordIds:
            [] as number[],

        domainIds:
            [] as number[],

        laboratoryIds:
            [] as number[],
    });

const itemId =
    computed(() =>
        Number(route.params.id),
    );

async function load() {
    loading.value = true;
    error.value = '';

    try {
        const [
            itemResponse,
            qualificationResponse,
            topicsResponse,
            keywordsResponse,
            domainsResponse,
            laboratoriesResponse,
        ] = await Promise.all([
            getWatchItem(
                itemId.value,
            ),
            getQualification(itemId.value),

            getTopics(),

            getKeywords(),

            getDomains(),

            getLaboratories(),
        ]);

        item.value =
            itemResponse.data;

        const qualification = qualificationResponse.data;
        form.value = {
            watchType: qualification.watchType,
            relevance: qualification.relevance,
            criticality: qualification.criticality,
            domainIds: qualification.domains?.map((domain) => domain.id) ?? [],
            laboratoryIds: qualification.laboratories?.map((laboratory) => laboratory.id) ?? [],
            topicIds: qualification.topicLinks?.map((link) => link.topic.id) ?? [],
            keywordIds: qualification.keywordLinks?.map((link) => link.keyword.id) ?? [],
        };

        topics.value =
            topicsResponse.data;

        keywords.value =
            keywordsResponse.data;

        domains.value =
            domainsResponse.data
                .filter(
                    (domain) =>
                        domain.active || form.value.domainIds.includes(domain.id),
                );

        laboratories.value =
            laboratoriesResponse.data
                .filter(
                    (laboratory) =>
                        laboratory.active || form.value.laboratoryIds.includes(laboratory.id),
                );

    } catch (err: any) {
        error.value =
            err.response?.data?.message ??
            'Impossible de charger l’élément.';
    } finally {
        loading.value = false;
    }
}

async function submit() {
    if (saving.value || loading.value) return;
    error.value = '';
    success.value = '';

    if (
        form.value.relevance === null
    ) {
        error.value =
            'La pertinence doit être renseignée.';

        return;
    }

    if (
        !form.value.criticality
    ) {
        error.value =
            'La criticité doit être renseignée.';

        return;
    }

    saving.value = true;

    try {
        const response = await qualifyWatchItem(
            itemId.value,
            {
                watchType:
                    form.value.watchType,

                relevance:
                    form.value.relevance,

                criticality:
                    form.value.criticality,

                topicIds:
                    form.value.topicIds,

                keywordIds:
                    form.value.keywordIds,

                domainIds:
                    form.value.domainIds,

                laboratoryIds:
                    form.value.laboratoryIds,
            },
        );

        success.value =
            'Qualification enregistrée avec succès.';

        item.value = response.data;
        form.value = {
            watchType: '', relevance: null, criticality: null,
            topicIds: [], keywordIds: [], domainIds: [], laboratoryIds: [],
        };
    } catch (err: any) {
        error.value =
            err.response?.data?.message ??
            'Impossible d’enregistrer la qualification.';
    } finally {
        saving.value = false;
    }
}

onMounted(load);
</script>

<template>
    <AppLayout>
        <div class="mx-auto max-w-5xl space-y-6">
            <div class="flex items-center justify-between">
                <div>
                    <h2 class="text-2xl font-bold text-slate-900">
                        Qualification
                    </h2>

                    <p class="text-slate-700">
                        Qualification métier
                        d’un élément de veille.
                    </p>
                </div>

                <Button label="Retour" severity="secondary" @click="
                    router.push(
                        '/watch-items',
                    )
                    " />
            </div>

            <Message v-if="error" severity="error">
                {{ error }}
            </Message>

            <Message v-if="success" severity="success">
                {{ success }}
            </Message>

            <div v-if="loading" class="text-center">
                Chargement...
            </div>

            <template v-else-if="item">
                <Card>
                    <template #title>
                        {{ item.title }}
                    </template>

                    <template #subtitle>
                        Source :
                        {{ item.source?.name }}
                    </template>

                    <template #content>
                        <div class="space-y-4">
                            <div>
                                <strong>
                                    Statut :
                                </strong>

                                <Tag :value="labelFr(item.status)
                                    " class="ml-2" />
                            </div>

                            <div v-if="item.doi">
                                <strong>
                                    DOI :
                                </strong>

                                {{ item.doi }}
                            </div>

                            <div>
                                <strong>
                                    Résumé :
                                </strong>

                                <p class="mt-2 whitespace-pre-line text-slate-600">
                                    {{
                                        item.summary ||
                                    'Aucun résumé disponible.'
                                    }}
                                </p>
                            </div>

                            <div v-if="item.url">
                                <a :href="item.url" target="_blank" rel="noopener noreferrer"
                                    class="text-blue-600 underline">
                                    Consulter la source originale
                                </a>
                            </div>
                        </div>
                    </template>
                </Card>

                <Card>
                    <template #title>
                        Qualification métier
                    </template>

                    <template #content>
                        <form class="space-y-6" @submit.prevent="
                            submit
                        ">
                            <div class="grid gap-5 md:grid-cols-2">

                                <div>
                                    <label class="mb-2 block font-medium">
                                        Type de veille
                                    </label>

                                    <Select v-model="form.watchType
                                        " option-label="label" option-value="value" :options="optionsFr(watchTypeOptions)
                        " class="w-full" />
                                </div>


                                <div>
                                    <label class="mb-2 block font-medium">
                                        Criticité
                                    </label>

                                    <Select v-model="form.criticality
                                        " option-label="label" option-value="value" :options="optionsFr(criticalityOptions)
                        " placeholder="Sélectionner" class="w-full" />
                                </div>


                                <div>
                                    <label class="mb-2 block font-medium">
                                        Pertinence
                                        (0 - 100)
                                    </label>

                                    <InputNumber v-model="form.relevance
                                        " :min="0" :max="100" class="w-full" />
                                </div>


                                <div>
                                    <label class="mb-2 block font-medium">
                                        Domaines
                                    </label>

                                    <MultiSelect v-model="form.domainIds
                                        " :options="domains
                        " option-label="name" option-value="id" display="chip" filter placeholder="Sélectionner"
                                        class="w-full" />
                                </div>


                                <div>
                                    <label class="mb-2 block font-medium">
                                        Laboratoires
                                    </label>

                                    <MultiSelect v-model="form.laboratoryIds
                                        " :options="laboratories
                        " option-label="name" option-value="id" display="chip" filter placeholder="Sélectionner"
                                        class="w-full" />
                                </div>


                                <div>
                                    <label class="mb-2 block font-medium">
                                        Thèmes
                                    </label>

                                    <MultiSelect v-model="form.topicIds
                                        " :options="topics
                        " option-label="label" option-value="id" display="chip" filter placeholder="Sélectionner"
                                        class="w-full" />
                                </div>


                                <div class="md:col-span-2">
                                    <label class="mb-2 block font-medium">
                                        Mots-clés
                                    </label>

                                    <MultiSelect v-model="form.keywordIds
                                        " :options="keywords
                        " option-label="label" option-value="id" display="chip" filter placeholder="Sélectionner"
                                        class="w-full" />
                                </div>
                            </div>

                            <div class="flex justify-end gap-3">
                                <Button type="button" label="Annuler" severity="secondary" @click="
                                    router.push(
                                        '/watch-items',
                                    )
                                    " />

                                <Button type="submit" label="Enregistrer la qualification" :loading="saving
                                    " />
                            </div>
                        </form>
                    </template>
                </Card>
            </template>
        </div>
    </AppLayout>
</template>
