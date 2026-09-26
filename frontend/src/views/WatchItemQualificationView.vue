<script setup lang="ts">
import {
    computed,
    onMounted,
    ref,
} from 'vue';

import {
    useRoute,
    useRouter,
} from 'vue-router';

import Button from 'primevue/button';
import Slider from 'primevue/slider';
import Message from 'primevue/message';
import MultiSelect from 'primevue/multiselect';
import Select from 'primevue/select';
import Tag from 'primevue/tag';

import {
    useToast,
} from 'primevue/usetoast';

import ArrowLeftIcon from '@primeicons/vue/arrow-left';

import AppLayout from '../layouts/AppLayout.vue';
import PageHeader from '../components/ui/PageHeader.vue';
import SectionCard from '../components/ui/SectionCard.vue';

import {
    labelFr,
    optionsFr,
} from '../i18n/labels';

import {
    getPriorityColor,
    getPriorityLabel,
} from '../utils/priority';

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

import {
    actionError,
    actionSuccess,
} from '../utils/action-toast';

import {
    clampInteger,
} from '../utils/numeric-input';


const route =
    useRoute();

const router =
    useRouter();

const toast =
    useToast();

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


const form =
    ref({
        watchType:
            '',

        relevance:
            null as
            number
            |
            null,

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
    computed(
        () =>
            Number(
                route.params.id,
            ),
    );


function setRelevance(
    value:
        number
        |
        null
        |
        undefined,
) {
    form.value.relevance =
        clampInteger(
            value,
            0,
            100,
        );
}


const priorityScore =
    computed({
        get:
            () =>
                form.value.relevance
                ??
                0,

        set:
            (
                value:
                    number,
            ) => {
                setRelevance(
                    value,
                );
            },
    });


const priorityLabel =
    computed(
        () =>
            getPriorityLabel(
                priorityScore.value,
            ),
    );


const priorityColor =
    computed(
        () =>
            getPriorityColor(
                priorityScore.value,
            ),
    );


async function load() {
    loading.value =
        true;

    error.value =
        '';

    try {
        const [
            itemResponse,
            qualificationResponse,
            topicsResponse,
            keywordsResponse,
            domainsResponse,
            laboratoriesResponse,
        ] =
            await Promise.all([
                getWatchItem(
                    itemId.value,
                ),

                getQualification(
                    itemId.value,
                ),

                getTopics(),

                getKeywords(),

                getDomains(),

                getLaboratories(),
            ]);


        item.value =
            itemResponse.data;


        const qualification =
            qualificationResponse.data;


        form.value = {
            watchType:
                qualification.watchType,

            relevance:
                qualification.relevance,

            domainIds:
                qualification.domains
                    ?.map(
                        (domain) =>
                            domain.id,
                    )
                ??
                [],

            laboratoryIds:
                qualification.laboratories
                    ?.map(
                        (laboratory) =>
                            laboratory.id,
                    )
                ??
                [],

            topicIds:
                qualification.topicLinks
                    ?.map(
                        (link) =>
                            link.topic.id,
                    )
                ??
                [],

            keywordIds:
                qualification.keywordLinks
                    ?.map(
                        (link) =>
                            link.keyword.id,
                    )
                ??
                [],
        };


        topics.value =
            topicsResponse.data;

        keywords.value =
            keywordsResponse.data;


        domains.value =
            domainsResponse.data.filter(
                (domain) =>
                    domain.active
                    ||
                    form.value.domainIds.includes(
                        domain.id,
                    ),
            );


        laboratories.value =
            laboratoriesResponse.data.filter(
                (laboratory) =>
                    laboratory.active
                    ||
                    form.value.laboratoryIds.includes(
                        laboratory.id,
                    ),
            );

    } catch (
    err:
        any
    ) {
        error.value =
            err.response
                ?.data
                ?.message
            ??
            'Impossible de charger l’élément.';
    } finally {
        loading.value =
            false;
    }
}


async function submit() {
    if (
        saving.value
        ||
        loading.value
    ) {
        return;
    }

    error.value =
        '';

    success.value =
        '';


    if (
        form.value.relevance ===
        null
    ) {
        error.value =
            'La priorité doit être renseignée.';

        toast.add({
            severity:
                'warn',

            summary:
                'Champ obligatoire',

            detail:
                error.value,

            life:
                4500,
        });

        return;
    }


    saving.value =
        true;

    try {
        const response =
            await qualifyWatchItem(
                itemId.value,
                {
                    watchType:
                        form.value.watchType,

                    relevance:
                        form.value.relevance,

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


        actionSuccess(
            toast,
            'Qualification enregistrée',
            'Les informations de qualification ont été enregistrées.',
        );


        item.value =
            response.data;

        await load();
    } catch (
    err:
        any
    ) {
        error.value =
            err.response
                ?.data
                ?.message
            ??
            'Impossible d’enregistrer la qualification.';

        actionError(
            toast,
            err,
            'Enregistrement impossible',
            'La qualification n’a pas pu être enregistrée.',
        );
    } finally {
        saving.value =
            false;
    }
}


onMounted(
    load,
);
</script>


<template>
    <AppLayout>

        <div class="qualification-page">

            <PageHeader title="Qualification" subtitle="Qualification métier et classement de l’élément de veille."
                eyebrow="Veille" icon="pi pi-check-circle">
                <template #actions>

                    <Button label="Retour" severity="secondary" @click="
                        router.push(
                            '/watch-items',
                        )
                        ">
                        <template #icon>
                            <ArrowLeftIcon size="0.9rem" />
                        </template>
                    </Button>

                </template>
            </PageHeader>


            <Message v-if="
                error
            " severity="error">
                {{ error }}
            </Message>


            <Message v-if="
                success
            " severity="success">
                {{ success }}
            </Message>


            <AppSpinner v-if="
                loading
            " size="large" centered label="Chargement de la qualification…" />


            <template v-else-if="
                item
            ">

                <SectionCard :title="item.title
                    " :subtitle="`Source : ${item.source?.name ?? 'Non renseignée'}`
            " icon="pi pi-file">

                    <div class="item-overview">

                        <div class="overview-meta">

                            <div>
                                <span>
                                    Statut
                                </span>

                                <Tag :value="labelFr(
                                    item.status,
                                )
                                    " />
                            </div>


                            <div v-if="
                                item.doi
                            ">
                                <span>
                                    DOI
                                </span>

                                <strong>
                                    {{ item.doi }}
                                </strong>
                            </div>

                        </div>


                        <details class="summary-block">
                            <summary>Afficher le résumé</summary>

                            <p>
                                {{
                                    item.summary
                                    ||
                                'Aucun résumé disponible.'
                                }}
                            </p>
                        </details>


                        <a v-if="
                            item.url
                        " :href="item.url
                " target="_blank" rel="noopener noreferrer" class="source-link">
                            <i class="pi pi-external-link" />

                            Consulter la source originale
                        </a>

                    </div>

                </SectionCard>


                <SectionCard title="Qualification métier"
                    subtitle="Classez la veille, associez les taxonomies et définissez sa priorité."
                    icon="pi pi-sliders-h">

                    <form class="qualification-form" @submit.prevent="
                        submit
                    ">

                        <div class="form-grid">

                            <div class="field-group">
                                <label>
                                    Type de veille
                                </label>

                                <div class="select-host">
                                  <Select append-to="self" v-model="form.watchType
                                    " option-label="label" option-value="value" :options="optionsFr(
                    watchTypeOptions,
                )
                    " class="w-full" />
                                </div>
                            </div>


                            <div class="priority-panel">

                                <div class="priority-heading">

                                    <div>
                                        <span class="priority-title required-label">
                                            Priorité globale
                                        </span>

                                    </div>


                                    <strong :style="{
                                        color:
                                            priorityColor,
                                    }">
                                        {{ priorityScore }} / 100 · {{ priorityLabel }}
                                    </strong>

                                </div>


                                <Slider aria-label="Priorité globale" v-model="priorityScore
                                    " :min="0
                    " :max="100
                    " :step="1
                    " class="w-full" />


                                <div class="priority-scale">
                                    <span>
                                        0
                                    </span>

                                    <span>
                                        25
                                    </span>

                                    <span>
                                        50
                                    </span>

                                    <span>
                                        75
                                    </span>

                                    <span>
                                        100
                                    </span>
                                </div>



                            </div>


                            <div class="field-group">
                                <label>
                                    Domaines
                                </label>

                                <div class="select-host">
                                  <MultiSelect append-to="self" v-model="form.domainIds
                                    " :options="domains
                    " option-label="name" option-value="id" filter placeholder="Sélectionner" class="w-full" />
                                </div>
                            </div>


                            <div class="field-group">
                                <label>
                                    Laboratoires
                                </label>

                                <div class="select-host">
                                  <MultiSelect append-to="self" v-model="form.laboratoryIds
                                    " :options="laboratories
                    " option-label="name" option-value="id" filter placeholder="Sélectionner" class="w-full" />
                                </div>
                            </div>


                            <div class="field-group">
                                <label>
                                    Thèmes
                                </label>

                                <div class="select-host">
                                  <MultiSelect append-to="self" v-model="form.topicIds
                                    " :options="topics
                    " option-label="label" option-value="id" filter placeholder="Sélectionner" class="w-full" />
                                </div>
                            </div>


                            <div class="field-group">
                                <label>
                                    Mots-clés
                                </label>

                                <div class="select-host">
                                  <MultiSelect append-to="self" v-model="form.keywordIds
                                    " :options="keywords
                    " option-label="label" option-value="id" filter placeholder="Sélectionner" class="w-full" />
                                </div>
                            </div>

                        </div>


                        <div class="form-actions">

                            <Button type="button" label="Annuler" severity="secondary" @click="
                                router.push(
                                    '/watch-items',
                                )
                                " />

                            <Button type="submit" label="Enregistrer la qualification" :loading="saving
                                " />

                        </div>

                    </form>

                </SectionCard>

            </template>

        </div>

    </AppLayout>
</template>


<style scoped>
.qualification-page {
    display:
        grid;

    max-width:
        72rem;

    margin:
        0 auto;

    gap:
        1rem;
}

.item-overview {
    display:
        grid;

    gap:
        0.6rem;
}

.overview-meta {
    display:
        flex;

    flex-wrap:
        wrap;

    gap:
        1.5rem;
}

.overview-meta>div {
    display:
        grid;

    gap:
        0.35rem;
}

.overview-meta span,
.summary-block>summary {
    color:
        var(--app-text-muted);

    font-size:
        0.66rem;

    font-weight:
        700;

    text-transform:
        uppercase;
}

.summary-block>summary {
    cursor: pointer;
    width: fit-content;
}

.summary-block[open]>summary {
    margin-bottom: 0.4rem;
}

.overview-meta strong {
    color:
        var(--app-text-secondary);

    font-size:
        0.75rem;
}

.summary-block p {
    margin:
        0;

    color:
        var(--app-text-secondary);

    font-size:
        0.78rem;

    line-height:
        1.6;

    white-space:
        pre-line;
}

.source-link {
    display:
        inline-flex;

    width:
        fit-content;

    align-items:
        center;

    gap:
        0.4rem;

    color:
        var(--app-blue);

    font-size:
        0.74rem;

    font-weight:
        650;
}

.qualification-form {
    display:
        grid;

    gap:
        0.8rem;
}

.form-grid {
    align-items: center;
    display:
        grid;

    grid-template-columns:
        repeat(2,
            minmax(0,
                1fr));

    gap:
        0.75rem 1rem;
}

.field-group {
    min-width: 0;
    display:
        grid;

    gap:
        0.3rem;
}

.field-group label,
.priority-title {
    color:
        var(--app-text-secondary);

    font-size:
        0.74rem;

    font-weight:
        700;
}

.priority-panel {
    display:
        grid;

    gap:
        0.6rem;

    padding:
        0.65rem 0.85rem;

    border-radius:
        0.85rem;

    background:
        var(--app-surface-2);
}

.priority-heading {
    display:
        flex;

    align-items:
        center;

    justify-content:
        space-between;

    gap:
        0.5rem;
    flex-wrap: wrap;
}

.priority-heading>strong {
    font-size:
        0.85rem;
}

.priority-scale {
    display:
        flex;

    justify-content:
        space-between;

    color:
        var(--app-text-muted);

    font-size:
        0.62rem;
}

.form-actions {
    flex-wrap: wrap;
    display:
        flex;

    justify-content:
        flex-end;

    gap:
        0.65rem;
}

@media (max-width: 700px) {
    .form-grid {
        grid-template-columns:
            1fr;
    }

    .priority-panel {
        grid-column:
            auto;
    }
}
</style>
