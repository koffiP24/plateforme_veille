<script setup lang="ts">
import {
  computed,
  onMounted,
  ref,
  watch,
} from 'vue';

import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Select from 'primevue/select';
import Tag from 'primevue/tag';

import BellIcon from '@primeicons/vue/bell';

import {
  useToast,
} from 'primevue/usetoast';

import AppLayout from '../layouts/AppLayout.vue';
import PageHeader from '../components/ui/PageHeader.vue';
import SectionCard from '../components/ui/SectionCard.vue';

import {
  labelFr,
  optionsFr,
} from '../i18n/labels';

import {
  createSubscription,
  deleteSubscription,
  getSubscriptionOptions,
  getSubscriptions,
} from '../services/subscriptions.service';

import {
  actionError,
  actionSuccess,
} from '../utils/action-toast';


type SubscriptionType =
  'SOURCE'
  |
  'TOPIC'
  |
  'DOMAIN'
  |
  'KEYWORD';


interface Choice {
  id:
  number;

  label:
  string;
}


interface SubscriptionOptions {
  sources:
  Array<{
    id:
    number;

    name:
    string;
  }>;

  topics:
  Array<{
    id:
    number;

    label:
    string;
  }>;

  domains:
  Array<{
    id:
    number;

    name:
    string;
  }>;

  keywords:
  Array<{
    id:
    number;

    label:
    string;
  }>;
}


const subscriptions =
  ref<any[]>([]);

const toast =
  useToast();

const choices =
  ref<SubscriptionOptions>({
    sources:
      [],

    topics:
      [],

    domains:
      [],

    keywords:
      [],
  });


const loading =
  ref(false);

const creating =
  ref(false);

const deleting =
  ref<number[]>([]);


const form =
  ref({
    subscriptionType:
      'SOURCE' as SubscriptionType,

    channel:
      'IN_APP',

    targetId:
      null as number | null,
  });


const subscriptionTypeOptions =
  optionsFr([
    'SOURCE',
    'TOPIC',
    'DOMAIN',
    'KEYWORD',
  ]);


const channelOptions =
  optionsFr([
    'IN_APP',
    'EMAIL',
  ]);


const targetOptions =
  computed<Choice[]>(
    () => {
      switch (
      form.value.subscriptionType
      ) {
        case 'TOPIC':
          return choices.value.topics;

        case 'DOMAIN':
          return choices.value.domains.map(
            (
              domain,
            ) => ({
              id:
                domain.id,

              label:
                domain.name,
            }),
          );

        case 'KEYWORD':
          return choices.value.keywords;

        default:
          return choices.value.sources.map(
            (
              source,
            ) => ({
              id:
                source.id,

              label:
                source.name,
            }),
          );
      }
    },
  );


const targetPlaceholder =
  computed(
    () =>
      `Choisir ${articleFor(form.value.subscriptionType)} ${labelFr(form.value.subscriptionType).toLowerCase()}`,
  );


function articleFor(
  type:
    SubscriptionType,
) {
  return type ===
    'SOURCE'
    ? 'une'
    : 'un';
}


async function load() {
  loading.value =
    true;

  try {
    const [
      subscriptionsResponse,
      optionsResponse,
    ] =
      await Promise.all([
        getSubscriptions(),
        getSubscriptionOptions(),
      ]);

    subscriptions.value =
      subscriptionsResponse.data;

    choices.value =
      optionsResponse.data;

  } finally {
    loading.value =
      false;
  }
}


async function subscribe() {
  if (
    !form.value.targetId
  ) {
    return;
  }


  const targetFields:
    Record<
      SubscriptionType,
      string
    > = {
    SOURCE:
      'sourceId',

    TOPIC:
      'topicId',

    DOMAIN:
      'domainId',

    KEYWORD:
      'keywordId',
  };


  const payload = {
    subscriptionType:
      form.value.subscriptionType,

    channel:
      form.value.channel,

    [
      targetFields[
      form.value.subscriptionType
      ]
    ]:
      form.value.targetId,
  };


  creating.value =
    true;


  try {
    await createSubscription(
      payload,
    );

    form.value.targetId =
      null;

    await load();


    actionSuccess(
      toast,
      'Abonnement créé',
      'Vous recevrez les notifications correspondant à cet abonnement.',
    );

  } catch (
  error
  ) {
    actionError(
      toast,
      error,
      'Abonnement impossible',
      'L’abonnement n’a pas pu être créé.',
    );

  } finally {
    creating.value =
      false;
  }
}


async function unsubscribe(
  id:
    number,
) {
  deleting.value = [
    ...deleting.value,
    id,
  ];

  try {
    await deleteSubscription(
      id,
    );

    await load();


    actionSuccess(
      toast,
      'Abonnement supprimé',
      'Vous ne recevrez plus les notifications de cet abonnement.',
    );

  } catch (
  error
  ) {
    actionError(
      toast,
      error,
      'Suppression impossible',
      'L’abonnement n’a pas pu être supprimé.',
    );

  } finally {
    deleting.value =
      deleting.value.filter(
        (
          subscriptionId,
        ) =>
          subscriptionId !==
          id,
      );
  }
}


function targetName(
  subscription:
    any,
) {
  return (
    subscription.source?.name
    ||
    subscription.topic?.label
    ||
    subscription.keyword?.label
    ||
    subscription.domain?.name
    ||
    'Non renseignée'
  );
}


watch(
  () =>
    form.value.subscriptionType,

  () => {
    form.value.targetId =
      null;
  },
);


onMounted(
  load,
);
</script>


<template>
  <AppLayout>

    <div class="subscriptions-page">

      <PageHeader title="Mes abonnements"
        subtitle="Choisissez les éléments de veille pour lesquels vous souhaitez recevoir des notifications."
        eyebrow="Alertes" icon="pi pi-bell" />


      <SectionCard title="Nouvel abonnement" subtitle="Définissez ce que vous souhaitez suivre."
        icon="pi pi-plus-circle">

        <div class="subscription-form">

          <div class="field-group select-host">

            <label>
              Type d’abonnement
            </label>

            <div class="select-host">
              <Select append-to="self" v-model="form.subscriptionType
              " :options="subscriptionTypeOptions
                " option-label="label" option-value="value" placeholder="Sélectionner un type" class="w-full" />
            </div>

          </div>


          <div class="field-group select-host">

            <label>
              Élément à suivre
            </label>

            <div class="select-host">
              <Select append-to="self" v-model="form.targetId
              " :options="targetOptions
                " option-label="label" option-value="id" :placeholder="targetPlaceholder
                " filter class="w-full" />
            </div>

          </div>


          <div class="field-group select-host">

            <label>
              Mode de notification
            </label>

            <div class="select-host">
              <Select append-to="self" v-model="form.channel
              " :options="channelOptions
                " option-label="label" option-value="value" placeholder="Sélectionner un mode" class="w-full" />
            </div>

          </div>


          <Button label="S’abonner" :loading="creating
            " :disabled="!form.targetId
              " @click="
              subscribe
            ">
            <template #icon>
              <BellIcon size="0.9rem" />
            </template>
          </Button>

        </div>


        <p v-if="
          !loading
          &&
          !targetOptions.length
        " class="empty-options">
          Aucun élément disponible pour ce type d’abonnement.
        </p>

      </SectionCard>


      <SectionCard :title="`${subscriptions.length} abonnement${subscriptions.length > 1 ? 's' : ''}`
        " subtitle="Liste de vos abonnements actifs et inactifs." icon="pi pi-list">

        <DataTable :value="subscriptions
          " :loading="loading
            " paginator :rows="10
            ">

          <template #empty>
            Aucun abonnement enregistré.
          </template>


          <Column header="Type">
            <template #body="{ data }">
              {{
                labelFr(
                  data.subscriptionType,
                )
              }}
            </template>
          </Column>


          <Column header="Élément suivi">
            <template #body="{ data }">
              <strong class="target-name">
                {{
                  targetName(
                    data,
                  )
                }}
              </strong>
            </template>
          </Column>


          <Column header="Mode de notification">
            <template #body="{ data }">
              {{
                labelFr(
                  data.channel,
                )
              }}
            </template>
          </Column>


          <Column header="Statut" style="width: 8rem">
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


          <Column header="Actions" style="width: 10rem">
            <template #body="{ data }">

              <Button label="Se désabonner" severity="danger" size="small" :loading="deleting.includes(
                data.id,
              )
                " @click="
                  unsubscribe(
                    data.id,
                  )
                  " />

            </template>
          </Column>

        </DataTable>

      </SectionCard>

    </div>

  </AppLayout>
</template>


<style scoped>
.subscriptions-page {
  display:
    grid;

  gap:
    1rem;
}

:deep(.section-card) {
  overflow:
    visible;
}

.subscription-form {
  display:
    grid;

  grid-template-columns:
    repeat(3,
      minmax(0,
        1fr)) auto;

  gap:
    0.75rem;

  align-items:
    end;
}

.field-group {
  display:
    grid;

  gap:
    0.4rem;
}

.field-group label {
  color:
    var(--app-text-secondary);

  font-size:
    0.7rem;

  font-weight:
    700;
}

.empty-options {
  margin:
    0.7rem 0 0;

  color:
    #fbbf24;

  font-size:
    0.7rem;
}

.target-name {
  color:
    var(--app-text);

  font-size:
    0.74rem;
}


/* SELECT FIX */

.select-host {
  position:
    relative;

  overflow:
    visible;

  isolation:
    isolate;

  z-index:
    10;
}

.select-host :deep(.p-select-overlay) {
  position:
    absolute !important;

  left:
    0 !important;

  right:
    auto !important;

  transform:
    none !important;

  width:
    100% !important;

  min-width:
    100% !important;

  z-index:
    10000 !important;
}

@media (max-width: 1000px) {
  .subscription-form {
    grid-template-columns:
      repeat(2,
        minmax(0,
          1fr));
  }
}

@media (max-width: 640px) {
  .subscription-form {
    grid-template-columns:
      1fr;
  }
}
</style>
