<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { isAxiosError } from 'axios';
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Dialog from 'primevue/dialog';
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
import { useToast } from 'primevue/usetoast';
import PencilIcon from '@primeicons/vue/pencil';
import PlusIcon from '@primeicons/vue/plus';
import TrashIcon from '@primeicons/vue/trash';

import AppLayout from '../layouts/AppLayout.vue';
import {
  createDomain,
  createKeyword,
  createLaboratory,
  createTopic,
  deleteDomain,
  deleteKeyword,
  deleteLaboratory,
  deleteTopic,
  getDomains,
  getKeywords,
  getLaboratories,
  getTopics,
  updateDomain,
  updateKeyword,
  updateLaboratory,
  updateTopic,
  type Domain,
  type Keyword,
  type Laboratory,
  type Topic,
} from '../services/taxonomy.service';

type TaxonomyKind = 'topics' | 'domains' | 'laboratories' | 'keywords';

interface DeleteTarget {
  id: number;
  kind: TaxonomyKind;
  label: string;
  typeLabel: string;
}

const toast = useToast();
const topics = ref<Topic[]>([]);
const domains = ref<Domain[]>([]);
const laboratories = ref<Laboratory[]>([]);
const keywords = ref<Keyword[]>([]);
const loading = ref(false);
const saving = ref(false);
const deleting = ref(false);
const error = ref('');

const topicDialog = ref(false);
const domainDialog = ref(false);
const laboratoryDialog = ref(false);
const keywordDialog = ref(false);
const deleteDialog = ref(false);

const editingTopicId = ref<number | null>(null);
const editingDomainId = ref<number | null>(null);
const editingLaboratoryId = ref<number | null>(null);
const editingKeywordId = ref<number | null>(null);
const deleteTarget = ref<DeleteTarget | null>(null);

const topicForm = ref({ label: '', description: '', parentId: null as number | null });
const domainForm = ref({ name: '', description: '', active: true });
const laboratoryForm = ref({ name: '', description: '', active: true });
const keywordForm = ref({ label: '', weight: 1, active: true });

const statusOptions = [
  { label: 'Actif', value: true },
  { label: 'Inactif', value: false },
];

function weightDescription(weight: number) {
  if (weight <= 3) return 'Importance faible';
  if (weight <= 6) return 'Importance moyenne';
  if (weight <= 9) return 'Importance élevée';
  return 'Importance critique';
}

const keywordWeightOptions = Array.from({ length: 10 }, (_, index) => {
  const value = index + 1;
  return {
    value,
    label: `${value} — ${weightDescription(value)}`,
    description: weightDescription(value),
  };
});

const topicParentOptions = computed(() =>
  topics.value.filter((topic) => topic.id !== editingTopicId.value),
);

function apiError(cause: unknown, fallback: string) {
  const message = isAxiosError(cause) ? cause.response?.data?.message : undefined;
  if (Array.isArray(message)) return message.join(' ');
  return typeof message === 'string' ? message : fallback;
}

function showSuccess(summary: string, detail: string) {
  toast.add({ severity: 'success', summary, detail, life: 4500 });
}

function showFailure(cause: unknown, fallback: string) {
  const detail = apiError(cause, fallback);
  error.value = detail;
  toast.add({ severity: 'error', summary: 'Opération impossible', detail, life: 6000 });
}

async function loadAll() {
  loading.value = true;
  error.value = '';
  try {
    const [topicsResponse, domainsResponse, laboratoriesResponse, keywordsResponse] = await Promise.all([
      getTopics(),
      getDomains(),
      getLaboratories(),
      getKeywords(),
    ]);
    topics.value = topicsResponse.data;
    domains.value = domainsResponse.data;
    laboratories.value = laboratoriesResponse.data;
    keywords.value = keywordsResponse.data;
  } catch (cause) {
    error.value = apiError(cause, 'Impossible de charger la taxonomie.');
  } finally {
    loading.value = false;
  }
}

function openNewTopic() {
  editingTopicId.value = null;
  topicForm.value = { label: '', description: '', parentId: null };
  topicDialog.value = true;
}

function editTopic(topic: Topic) {
  editingTopicId.value = topic.id;
  topicForm.value = {
    label: topic.label,
    description: topic.description ?? '',
    parentId: topic.parent?.id ?? null,
  };
  topicDialog.value = true;
}

function openNewDomain() {
  editingDomainId.value = null;
  domainForm.value = { name: '', description: '', active: true };
  domainDialog.value = true;
}

function editDomain(domain: Domain) {
  editingDomainId.value = domain.id;
  domainForm.value = { name: domain.name, description: domain.description ?? '', active: domain.active };
  domainDialog.value = true;
}

function openNewLaboratory() {
  editingLaboratoryId.value = null;
  laboratoryForm.value = { name: '', description: '', active: true };
  laboratoryDialog.value = true;
}

function editLaboratory(laboratory: Laboratory) {
  editingLaboratoryId.value = laboratory.id;
  laboratoryForm.value = {
    name: laboratory.name,
    description: laboratory.description ?? '',
    active: laboratory.active,
  };
  laboratoryDialog.value = true;
}

function openNewKeyword() {
  editingKeywordId.value = null;
  keywordForm.value = { label: '', weight: 1, active: true };
  keywordDialog.value = true;
}

function editKeyword(keyword: Keyword) {
  editingKeywordId.value = keyword.id;
  keywordForm.value = { label: keyword.label, weight: Number(keyword.weight), active: keyword.active };
  keywordDialog.value = true;
}

async function submitTopic() {
  if (saving.value) return;
  saving.value = true;
  error.value = '';
  const id = editingTopicId.value;
  try {
    const payload = {
      label: topicForm.value.label,
      description: topicForm.value.description || (id ? null : undefined),
      parentId: topicForm.value.parentId,
    };
    if (id) await updateTopic(id, payload);
    else await createTopic(payload);
    topicDialog.value = false;
    showSuccess(id ? 'Thème modifié' : 'Thème créé', 'Les informations du thème ont été enregistrées.');
    await loadAll();
  } catch (cause) {
    showFailure(cause, id ? 'Modification du thème impossible.' : 'Création du thème impossible.');
  } finally {
    saving.value = false;
  }
}

async function submitDomain() {
  if (saving.value) return;
  saving.value = true;
  error.value = '';
  const id = editingDomainId.value;
  try {
    if (id) await updateDomain(id, domainForm.value);
    else await createDomain(domainForm.value);
    domainDialog.value = false;
    showSuccess(id ? 'Domaine modifié' : 'Domaine créé', 'Les informations du domaine ont été enregistrées.');
    await loadAll();
  } catch (cause) {
    showFailure(cause, id ? 'Modification du domaine impossible.' : 'Création du domaine impossible.');
  } finally {
    saving.value = false;
  }
}

async function submitLaboratory() {
  if (saving.value) return;
  saving.value = true;
  error.value = '';
  const id = editingLaboratoryId.value;
  try {
    if (id) await updateLaboratory(id, laboratoryForm.value);
    else await createLaboratory(laboratoryForm.value);
    laboratoryDialog.value = false;
    showSuccess(id ? 'Laboratoire modifié' : 'Laboratoire créé', 'Les informations ont été enregistrées.');
    await loadAll();
  } catch (cause) {
    showFailure(cause, id ? 'Modification du laboratoire impossible.' : 'Création du laboratoire impossible.');
  } finally {
    saving.value = false;
  }
}

async function submitKeyword() {
  if (saving.value) return;
  saving.value = true;
  error.value = '';
  const id = editingKeywordId.value;
  try {
    if (id) await updateKeyword(id, keywordForm.value);
    else await createKeyword(keywordForm.value);
    keywordDialog.value = false;
    showSuccess(id ? 'Mot-clé modifié' : 'Mot-clé créé', 'Les informations du mot-clé ont été enregistrées.');
    await loadAll();
  } catch (cause) {
    showFailure(cause, id ? 'Modification du mot-clé impossible.' : 'Création du mot-clé impossible.');
  } finally {
    saving.value = false;
  }
}

function askDelete(target: DeleteTarget) {
  deleteTarget.value = target;
  deleteDialog.value = true;
}

async function confirmDelete() {
  const target = deleteTarget.value;
  if (!target || deleting.value) return;
  deleting.value = true;
  error.value = '';
  try {
    const actions: Record<TaxonomyKind, (id: number) => Promise<unknown>> = {
      topics: deleteTopic,
      domains: deleteDomain,
      laboratories: deleteLaboratory,
      keywords: deleteKeyword,
    };
    await actions[target.kind](target.id);
    deleteDialog.value = false;
    deleteTarget.value = null;
    showSuccess('Suppression réussie', `Le ${target.typeLabel} a été supprimé.`);
    await loadAll();
  } catch (cause) {
    showFailure(cause, `Impossible de supprimer le ${target.typeLabel}.`);
  } finally {
    deleting.value = false;
  }
}

onMounted(loadAll);
</script>

<template>
  <AppLayout>
    <div class="space-y-6">
      <div>
        <h2 class="text-2xl font-bold text-slate-900">Taxonomie</h2>
        <p class="text-slate-700">Gestion des thèmes, domaines, laboratoires et mots-clés.</p>
      </div>

      <Message v-if="error" severity="error" closable @close="error = ''">{{ error }}</Message>

      <Tabs value="topics">
        <TabList>
          <Tab value="topics">Thèmes</Tab>
          <Tab value="domains">Domaines</Tab>
          <Tab value="laboratories">Laboratoires</Tab>
          <Tab value="keywords">Mots-clés</Tab>
        </TabList>

        <TabPanels>
          <TabPanel value="topics">
            <div class="space-y-4 pt-4">
              <div class="flex justify-end">
                <Button label="Ajouter un thème" @click="openNewTopic">
                  <template #icon><PlusIcon size="0.9rem" /></template>
                </Button>
              </div>
              <DataTable :value="topics" :loading="loading" paginator :rows="10">
                <Column field="label" header="Libellé" />
                <Column field="description" header="Description" />
                <Column header="Parent"><template #body="{ data }">{{ data.parent?.label ?? '-' }}</template></Column>
                <Column header="Actions">
                  <template #body="{ data }">
                    <div class="flex items-center gap-2">
                      <Button severity="secondary" rounded size="small" title="Modifier le thème"
                        aria-label="Modifier le thème" @click="editTopic(data)">
                        <template #icon><PencilIcon size="0.9rem" /></template>
                      </Button>
                      <Button severity="danger" text rounded size="small" title="Supprimer le thème"
                        aria-label="Supprimer le thème"
                        @click="askDelete({ id: data.id, kind: 'topics', label: data.label, typeLabel: 'thème' })">
                        <template #icon><TrashIcon size="0.9rem" /></template>
                      </Button>
                    </div>
                  </template>
                </Column>
              </DataTable>
            </div>
          </TabPanel>

          <TabPanel value="domains">
            <div class="space-y-4 pt-4">
              <div class="flex justify-end">
                <Button label="Ajouter un domaine" @click="openNewDomain">
                  <template #icon><PlusIcon size="0.9rem" /></template>
                </Button>
              </div>
              <DataTable :value="domains" :loading="loading" paginator :rows="10">
                <Column field="name" header="Nom" />
                <Column field="description" header="Description" />
                <Column header="Statut">
                  <template #body="{ data }">
                    <Tag :value="data.active ? 'Actif' : 'Inactif'" :severity="data.active ? 'success' : 'secondary'" />
                  </template>
                </Column>
                <Column header="Actions">
                  <template #body="{ data }">
                    <div class="flex items-center gap-2">
                      <Button severity="secondary" rounded size="small" title="Modifier le domaine"
                        aria-label="Modifier le domaine" @click="editDomain(data)">
                        <template #icon><PencilIcon size="0.9rem" /></template>
                      </Button>
                      <Button severity="danger" text rounded size="small" title="Supprimer le domaine"
                        aria-label="Supprimer le domaine"
                        @click="askDelete({ id: data.id, kind: 'domains', label: data.name, typeLabel: 'domaine' })">
                        <template #icon><TrashIcon size="0.9rem" /></template>
                      </Button>
                    </div>
                  </template>
                </Column>
              </DataTable>
            </div>
          </TabPanel>

          <TabPanel value="laboratories">
            <div class="space-y-4 pt-4">
              <div class="flex justify-end">
                <Button label="Ajouter un laboratoire" @click="openNewLaboratory">
                  <template #icon><PlusIcon size="0.9rem" /></template>
                </Button>
              </div>
              <DataTable :value="laboratories" :loading="loading" paginator :rows="10">
                <Column field="name" header="Nom" />
                <Column field="description" header="Description" />
                <Column header="Statut">
                  <template #body="{ data }">
                    <Tag :value="data.active ? 'Actif' : 'Inactif'" :severity="data.active ? 'success' : 'secondary'" />
                  </template>
                </Column>
                <Column header="Actions">
                  <template #body="{ data }">
                    <div class="flex items-center gap-2">
                      <Button severity="secondary" rounded size="small" title="Modifier le laboratoire"
                        aria-label="Modifier le laboratoire" @click="editLaboratory(data)">
                        <template #icon><PencilIcon size="0.9rem" /></template>
                      </Button>
                      <Button severity="danger" text rounded size="small" title="Supprimer le laboratoire"
                        aria-label="Supprimer le laboratoire"
                        @click="askDelete({ id: data.id, kind: 'laboratories', label: data.name, typeLabel: 'laboratoire' })">
                        <template #icon><TrashIcon size="0.9rem" /></template>
                      </Button>
                    </div>
                  </template>
                </Column>
              </DataTable>
            </div>
          </TabPanel>

          <TabPanel value="keywords">
            <div class="space-y-4 pt-4">
              <div class="flex justify-end">
                <Button label="Ajouter un mot-clé" @click="openNewKeyword">
                  <template #icon><PlusIcon size="0.9rem" /></template>
                </Button>
              </div>
              <DataTable :value="keywords" :loading="loading" paginator :rows="10">
                <Column field="label" header="Mot-clé" />
                <Column header="Poids">
                  <template #body="{ data }">
                    <span>{{ data.weight }}</span>
                    <span class="ml-2 text-xs font-normal text-slate-500">
                      {{ weightDescription(Number(data.weight)) }}
                    </span>
                  </template>
                </Column>
                <Column header="Statut">
                  <template #body="{ data }">
                    <Tag :value="data.active ? 'Actif' : 'Inactif'" :severity="data.active ? 'success' : 'secondary'" />
                  </template>
                </Column>
                <Column header="Actions">
                  <template #body="{ data }">
                    <div class="flex items-center gap-2">
                      <Button severity="secondary" rounded size="small" title="Modifier le mot-clé"
                        aria-label="Modifier le mot-clé" @click="editKeyword(data)">
                        <template #icon><PencilIcon size="0.9rem" /></template>
                      </Button>
                      <Button severity="danger" text rounded size="small" title="Supprimer le mot-clé"
                        aria-label="Supprimer le mot-clé"
                        @click="askDelete({ id: data.id, kind: 'keywords', label: data.label, typeLabel: 'mot-clé' })">
                        <template #icon><TrashIcon size="0.9rem" /></template>
                      </Button>
                    </div>
                  </template>
                </Column>
              </DataTable>
            </div>
          </TabPanel>
        </TabPanels>
      </Tabs>

      <Dialog v-model:visible="topicDialog" modal :header="editingTopicId ? 'Modifier le thème' : 'Nouveau thème'"
        class="w-full max-w-xl" :closable="!saving" :close-on-escape="!saving">
        <form class="space-y-4" @submit.prevent="submitTopic">
          <div><label class="required-label mb-2 block">Libellé</label><InputText v-model="topicForm.label" class="w-full" required /></div>
          <div><label class="mb-2 block">Description</label><Textarea v-model="topicForm.description" class="w-full" rows="4" /></div>
          <div>
            <label class="mb-2 block">Thème parent</label>
            <Select append-to="self" v-model="topicForm.parentId" :options="topicParentOptions" option-label="label" option-value="id"
              show-clear placeholder="Aucun" class="w-full" />
          </div>
          <div class="flex justify-end gap-3">
            <Button type="button" label="Annuler" severity="secondary" :disabled="saving" @click="topicDialog = false" />
            <Button type="submit" :label="editingTopicId ? 'Enregistrer' : 'Créer'" :loading="saving" />
          </div>
        </form>
      </Dialog>

      <Dialog v-model:visible="domainDialog" modal :header="editingDomainId ? 'Modifier le domaine' : 'Nouveau domaine'"
        class="w-full max-w-xl" :closable="!saving" :close-on-escape="!saving">
        <form class="space-y-4" @submit.prevent="submitDomain">
          <div><label class="required-label mb-2 block">Nom</label><InputText v-model="domainForm.name" class="w-full" required /></div>
          <div><label class="mb-2 block">Description</label><Textarea v-model="domainForm.description" class="w-full" rows="4" /></div>
          <div>
            <label class="mb-2 block">Statut</label>
            <Select append-to="self" v-model="domainForm.active" :options="statusOptions" option-label="label" option-value="value" class="w-full" />
          </div>
          <div class="flex justify-end gap-3">
            <Button type="button" label="Annuler" severity="secondary" :disabled="saving" @click="domainDialog = false" />
            <Button type="submit" :label="editingDomainId ? 'Enregistrer' : 'Créer'" :loading="saving" />
          </div>
        </form>
      </Dialog>

      <Dialog v-model:visible="laboratoryDialog" modal
        :header="editingLaboratoryId ? 'Modifier le laboratoire' : 'Nouveau laboratoire'" class="w-full max-w-xl"
        :closable="!saving" :close-on-escape="!saving">
        <form class="space-y-4" @submit.prevent="submitLaboratory">
          <div><label class="required-label mb-2 block">Nom</label><InputText v-model="laboratoryForm.name" class="w-full" required /></div>
          <div><label class="mb-2 block">Description</label><Textarea v-model="laboratoryForm.description" class="w-full" rows="4" /></div>
          <div>
            <label class="mb-2 block">Statut</label>
            <Select append-to="self" v-model="laboratoryForm.active" :options="statusOptions" option-label="label" option-value="value" class="w-full" />
          </div>
          <div class="flex justify-end gap-3">
            <Button type="button" label="Annuler" severity="secondary" :disabled="saving" @click="laboratoryDialog = false" />
            <Button type="submit" :label="editingLaboratoryId ? 'Enregistrer' : 'Créer'" :loading="saving" />
          </div>
        </form>
      </Dialog>

      <Dialog v-model:visible="keywordDialog" modal :header="editingKeywordId ? 'Modifier le mot-clé' : 'Nouveau mot-clé'"
        class="w-full max-w-xl" :closable="!saving" :close-on-escape="!saving">
        <form class="space-y-4" @submit.prevent="submitKeyword">
          <div><label class="required-label mb-2 block">Libellé</label><InputText v-model="keywordForm.label" class="w-full" required /></div>
          <div>
            <label class="mb-2 block">Poids</label>
            <Select append-to="self" v-model="keywordForm.weight" :options="keywordWeightOptions" option-label="label" option-value="value"
              class="w-full" placeholder="Sélectionner un poids">
              <template #value="{ value, placeholder }">
                <div v-if="value" class="flex items-center gap-2">
                  <span>{{ value }}</span><span class="font-normal text-slate-500">{{ weightDescription(value) }}</span>
                </div>
                <span v-else class="p-placeholder">{{ placeholder }}</span>
              </template>
              <template #option="{ option }">
                <div class="flex items-center gap-2">
                  <span>{{ option.value }}</span><span class="text-sm font-normal text-slate-500">{{ option.description }}</span>
                </div>
              </template>
            </Select>
          </div>
          <div>
            <label class="mb-2 block">Statut</label>
            <Select append-to="self" v-model="keywordForm.active" :options="statusOptions" option-label="label" option-value="value" class="w-full" />
          </div>
          <div class="flex justify-end gap-3">
            <Button type="button" label="Annuler" severity="secondary" :disabled="saving" @click="keywordDialog = false" />
            <Button type="submit" :label="editingKeywordId ? 'Enregistrer' : 'Créer'" :loading="saving" />
          </div>
        </form>
      </Dialog>

      <Dialog v-model:visible="deleteDialog" modal header="Confirmer la suppression" class="w-full max-w-md"
        :closable="!deleting" :close-on-escape="!deleting">
        <div class="space-y-5">
          <p v-if="deleteTarget" class="leading-6">
            Êtes-vous sûr de vouloir supprimer le {{ deleteTarget.typeLabel }}
            <strong>« {{ deleteTarget.label }} »</strong> ?
          </p>
          <Message severity="warn" :closable="false">Cette suppression est définitive.</Message>
          <div class="flex justify-end gap-3">
            <Button label="Annuler" severity="secondary" :disabled="deleting" @click="deleteDialog = false" />
            <Button label="Supprimer" severity="danger" :loading="deleting" @click="confirmDelete">
              <template #icon><TrashIcon size="0.9rem" /></template>
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  </AppLayout>
</template>
