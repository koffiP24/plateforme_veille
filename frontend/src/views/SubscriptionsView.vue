<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Select from 'primevue/select';

import AppLayout from '../layouts/AppLayout.vue';
import { labelFr, optionsFr } from '../i18n/labels';
import {
  createSubscription,
  deleteSubscription,
  getSubscriptionOptions,
  getSubscriptions,
} from '../services/subscriptions.service';

type SubscriptionType = 'SOURCE' | 'TOPIC' | 'DOMAIN' | 'KEYWORD';

interface Choice {
  id: number;
  label: string;
}

interface SubscriptionOptions {
  sources: Array<{ id: number; name: string }>;
  topics: Array<{ id: number; label: string }>;
  domains: Array<{ id: number; name: string }>;
  keywords: Array<{ id: number; label: string }>;
}

const subscriptions = ref<any[]>([]);
const choices = ref<SubscriptionOptions>({ sources: [], topics: [], domains: [], keywords: [] });
const loading = ref(false);
const creating = ref(false);
const deleting = ref<number[]>([]);
const form = ref({
  subscriptionType: 'SOURCE' as SubscriptionType,
  channel: 'IN_APP',
  targetId: null as number | null,
});

const subscriptionTypeOptions = optionsFr(['SOURCE', 'TOPIC', 'DOMAIN', 'KEYWORD']);
const channelOptions = optionsFr(['IN_APP', 'EMAIL']);
const targetOptions = computed<Choice[]>(() => {
  switch (form.value.subscriptionType) {
    case 'TOPIC':
      return choices.value.topics;
    case 'DOMAIN':
      return choices.value.domains.map((domain) => ({ id: domain.id, label: domain.name }));
    case 'KEYWORD':
      return choices.value.keywords;
    default:
      return choices.value.sources.map((source) => ({ id: source.id, label: source.name }));
  }
});
const targetPlaceholder = computed(() => `Choisir ${articleFor(form.value.subscriptionType)} ${labelFr(form.value.subscriptionType).toLowerCase()}`);

function articleFor(type: SubscriptionType) {
  return type === 'SOURCE' ? 'une' : 'un';
}

async function load() {
  loading.value = true;
  try {
    const [subscriptionsResponse, optionsResponse] = await Promise.all([
      getSubscriptions(),
      getSubscriptionOptions(),
    ]);
    subscriptions.value = subscriptionsResponse.data;
    choices.value = optionsResponse.data;
  } finally {
    loading.value = false;
  }
}

async function subscribe() {
  if (!form.value.targetId) return;
  const targetFields: Record<SubscriptionType, string> = {
    SOURCE: 'sourceId',
    TOPIC: 'topicId',
    DOMAIN: 'domainId',
    KEYWORD: 'keywordId',
  };
  const payload = {
    subscriptionType: form.value.subscriptionType,
    channel: form.value.channel,
    [targetFields[form.value.subscriptionType]]: form.value.targetId,
  };

  creating.value = true;
  try {
    await createSubscription(payload);
    form.value.targetId = null;
    await load();
  } finally {
    creating.value = false;
  }
}

async function unsubscribe(id: number) {
  deleting.value = [...deleting.value, id];
  try {
    await deleteSubscription(id);
    await load();
  } finally {
    deleting.value = deleting.value.filter((subscriptionId) => subscriptionId !== id);
  }
}

function targetName(subscription: any) {
  return subscription.source?.name
    || subscription.topic?.label
    || subscription.keyword?.label
    || subscription.domain?.name
    || 'Non renseignée';
}

watch(() => form.value.subscriptionType, () => {
  form.value.targetId = null;
});

onMounted(load);
</script>

<template>
  <AppLayout>
    <div class="space-y-5">
      <h2 class="text-2xl font-bold">Mes abonnements</h2>

      <section class="rounded-xl bg-white p-5 shadow-sm">
        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Select v-model="form.subscriptionType" :options="subscriptionTypeOptions" option-label="label"
            option-value="value" placeholder="Type d’abonnement" />
          <Select v-model="form.targetId" :options="targetOptions" option-label="label" option-value="id"
            :placeholder="targetPlaceholder" filter />
          <Select v-model="form.channel" :options="channelOptions" option-label="label" option-value="value"
            placeholder="Mode de notification" />
          <Button label="S’abonner" icon="pi pi-bell" :loading="creating" :disabled="!form.targetId"
            @click="subscribe" />
        </div>
        <p v-if="!loading && !targetOptions.length" class="mt-3 text-sm text-amber-700">
          Aucun élément disponible pour ce type d’abonnement.
        </p>
      </section>

      <section class="rounded-xl bg-white p-5 shadow-sm">
        <DataTable :value="subscriptions" :loading="loading" paginator :rows="10">
          <template #empty>Aucun abonnement enregistré.</template>
          <Column header="Type"><template #body="{ data }">{{ labelFr(data.subscriptionType) }}</template></Column>
          <Column header="Élément suivi"><template #body="{ data }">{{ targetName(data) }}</template></Column>
          <Column header="Mode de notification"><template #body="{ data }">{{ labelFr(data.channel) }}</template></Column>
          <Column header="Actions">
            <template #body="{ data }">
              <Button label="Se désabonner" severity="danger" size="small" :loading="deleting.includes(data.id)"
                @click="unsubscribe(data.id)" />
            </template>
          </Column>
        </DataTable>
      </section>
    </div>
  </AppLayout>
</template>
