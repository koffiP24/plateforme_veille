<script setup lang="ts">
import Slider from 'primevue/slider';
import {
    getPriorityColor,
    getPriorityLabel,
} from '../utils/priority';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Button from 'primevue/button'; import Card from 'primevue/card'; import Column from 'primevue/column'; import DataTable from 'primevue/datatable'; import Dialog from 'primevue/dialog'; import InputText from 'primevue/inputtext'; import Message from 'primevue/message'; import Select from 'primevue/select'; import Tag from 'primevue/tag'; import Textarea from 'primevue/textarea';
import AppLayout from '../layouts/AppLayout.vue';
import { labelFr, optionsFr } from '../i18n/labels';
import { useAuthStore } from '../stores/auth';
import { getWatchItem, type WatchItem } from '../services/watch-items.service';
import { archiveWatchItem, getReviews, publishWatchItem, reviewWatchItem, type Review } from '../services/validation.service';
import { createAction, deleteAction, getActions, updateAction, type FollowUpAction } from '../services/actions.service';
import { getUsers, type AssignableUser } from '../services/users.service';
import PlusIcon from '@primeicons/vue/plus';
import PencilIcon from '@primeicons/vue/pencil';
import SearchIcon from '@primeicons/vue/search';
import TrashIcon from '@primeicons/vue/trash';
import { useToast } from 'primevue/usetoast';
import ArrowLeftIcon from '@primeicons/vue/arrow-left';
import { actionError as showActionError, actionSuccess } from '../utils/action-toast';
import { clampInteger } from '../utils/numeric-input';


const route = useRoute(); const router = useRouter(); const auth = useAuthStore();
const toast = useToast();
const item = ref<WatchItem | null>(null); const reviews = ref<Review[]>([]); const actions = ref<FollowUpAction[]>([]); const users = ref<AssignableUser[]>([]); const usersLoading = ref(false);
const loading = ref(false); const error = ref(''); const success = ref('');
const roles = computed(() => auth.user?.roles ?? []);
const userOptions = computed(() => users.value.map((user) => ({
    id: user.id,
    label: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email,
})));
const canValidate = computed(() => roles.value.includes('ADMIN') || roles.value.includes('RESPONSABLE_VEILLE'));
const canCreateAction = computed(() => roles.value.includes('ADMIN') || roles.value.includes('RESPONSABLE_VEILLE') || roles.value.includes('REFERENT_LABORATOIRE'));
const canViewReviews = computed(() =>
    ['ADMIN', 'RESPONSABLE_VEILLE', 'REFERENT_LABORATOIRE', 'OPERATEUR_VEILLE']
        .some((role) => roles.value.includes(role)),
);
const reviewDialog = ref(false); const reviewDecision = ref<'VALIDATE' | 'REJECT'>('VALIDATE');
const reviewForm = ref({
    relevance: 0,
    comment: '',
});

const reviewPriorityScore = computed({
    get: () => reviewForm.value.relevance,

    set: (value: number) => {
        reviewForm.value.relevance =
            clampInteger(value, 0, 100) ?? 0;
    },
});

const reviewPriorityLabel = computed(() =>
    getPriorityLabel(reviewPriorityScore.value),
);

const reviewPriorityColor = computed(() =>
    getPriorityColor(reviewPriorityScore.value),
);
const actionDialog = ref(false); const actionTypes = ['ANALYSE_IMPACT', 'MISE_A_JOUR_METHODE', 'FORMATION', 'VERIFICATION', 'AUTRE'];
const actionForm = ref({ title: '', description: '', actionType: 'ANALYSE_IMPACT', impact: '', dueDate: '', ownerId: null as number | null });
const actionError = ref(''); const actionSubmitting = ref(false);
const reviewSearch = ref(''); const actionSearch = ref('');
const editActionDialog = ref(false); const editingAction = ref<FollowUpAction | null>(null);
const editActionError = ref(''); const editActionSubmitting = ref(false);
const deleteActionDialog = ref(false); const actionToDelete = ref<FollowUpAction | null>(null);
const actionDeleting = ref(false);
const editActionForm = ref({ title: '', description: '', actionType: 'ANALYSE_IMPACT', impact: '', dueDate: '', ownerId: null as number | null });
const itemId = computed(() => Number(route.params.id));

const dateTimeFormatter = new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
});
const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
});

function formatDate(value: string | null | undefined, includeTime = true): string {
    if (!value) return 'Non renseignée';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Non renseignée';
    return includeTime ? dateTimeFormatter.format(date) : dateFormatter.format(date);
}

function normalizeSearch(value: unknown): string {
    return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr-FR');
}

const filteredReviews = computed(() => {
    const query = normalizeSearch(reviewSearch.value.trim());
    if (!query) return reviews.value;
    return reviews.value.filter((review) => [
        labelFr(review.status), labelFr(review.criticality), review.relevance, review.comment,
        review.reviewer?.firstName, review.reviewer?.lastName, review.reviewer?.email,
        formatDate(review.reviewedAt),
    ].some((value) => normalizeSearch(value).includes(query)));
});

const filteredActions = computed(() => {
    const query = normalizeSearch(actionSearch.value.trim());
    if (!query) return actions.value;
    return actions.value.filter((action) => [
        action.title, action.description, labelFr(action.actionType), action.impact,
        action.owner?.firstName, action.owner?.lastName, action.owner?.email,
        labelFr(action.status), formatDate(action.dueDate, false),
    ].some((value) => normalizeSearch(value).includes(query)));
});

const canCreateActionForCurrentStatus = computed(() =>
    canCreateAction.value && Boolean(item.value && ['A_QUALIFIER', 'VALIDE', 'PUBLIE'].includes(item.value.status)),
);
const actionCreationHelp = computed(() => {
    switch (item.value?.status) {
        case 'NOUVEAU':
            return 'Cette veille doit d’abord être qualifiée avant de pouvoir créer une action de suivi.';
        case 'REJETE':
            return 'Une action de suivi ne peut pas être créée pour une veille rejetée.';
        case 'ARCHIVE':
            return 'Une action de suivi ne peut pas être créée pour une veille archivée.';
        default:
            return 'La création d’une action est autorisée pour les veilles à qualifier, validées ou publiées.';
    }
});

function canManageAction(action: FollowUpAction) {
    if (roles.value.includes('ADMIN') || roles.value.includes('RESPONSABLE_VEILLE')) return true;
    return roles.value.includes('REFERENT_LABORATOIRE') && action.owner?.id === auth.user?.id;
}

function actionOwnerName(action: FollowUpAction) {
    return `${action.owner?.firstName ?? ''} ${action.owner?.lastName ?? ''}`.trim()
        || action.owner?.email
        || 'Non renseigné';
}

async function load() {
    loading.value = true; error.value = '';
    try {
        const i = await getWatchItem(itemId.value);
        item.value = i.data;
        reviews.value = canViewReviews.value ? (await getReviews(itemId.value)).data : [];
        if (canCreateAction.value) { actions.value = (await getActions(itemId.value)).data; try { users.value = (await getUsers()).data; } catch { users.value = []; } }
    } catch (e: any) { error.value = e.response?.data?.message ?? 'Impossible de charger la veille.'; } finally { loading.value = false; }
}
async function loadAssignableUsers() {
    usersLoading.value = true;
    try {
        users.value = (await getUsers()).data;
    } catch (e: any) {
        users.value = [];
        actionError.value = e.response?.data?.message ?? 'Impossible de charger la liste des responsables.';
    } finally {
        usersLoading.value = false;
    }
}
async function openActionDialog() {
    error.value = '';
    actionError.value = '';
    actionDialog.value = true;
    await loadAssignableUsers();
}
function openReview(
    decision: 'VALIDATE' | 'REJECT',
) {
    reviewDecision.value = decision;

    reviewForm.value = {
        relevance: item.value?.relevance ?? 0,
        comment: '',
    };

    reviewDialog.value = true;
} async function submitReview() { try { await reviewWatchItem(itemId.value, { decision: reviewDecision.value, relevance: reviewForm.value.relevance ?? undefined, comment: reviewForm.value.comment || undefined }); reviewDialog.value = false; success.value = reviewDecision.value === 'VALIDATE' ? 'Élément validé.' : 'Élément rejeté.'; actionSuccess(toast, reviewDecision.value === 'VALIDATE' ? 'Veille validée' : 'Veille rejetée', success.value); await load(); } catch (e: any) { error.value = e.response?.data?.message ?? 'Décision impossible.'; showActionError(toast, e, 'Décision impossible', 'La décision n’a pas pu être enregistrée.'); } }
async function publish() { try { await publishWatchItem(itemId.value, 'Publication validée.'); success.value = 'Élément publié.'; actionSuccess(toast, 'Veille publiée', 'L’élément de veille est maintenant publié.'); await load(); } catch (e: any) { error.value = e.response?.data?.message ?? 'Publication impossible.'; showActionError(toast, e, 'Publication impossible', 'L’élément de veille n’a pas pu être publié.'); } }
async function archive() { try { await archiveWatchItem(itemId.value, 'Archivage.'); success.value = 'Élément archivé.'; actionSuccess(toast, 'Veille archivée', 'L’élément de veille a été archivé.'); await load(); } catch (e: any) { error.value = e.response?.data?.message ?? 'Archivage impossible.'; showActionError(toast, e, 'Archivage impossible', 'L’élément de veille n’a pas pu être archivé.'); } }
async function submitAction() {
    actionError.value = '';
    if (!actionForm.value.title.trim()) { actionError.value = 'Saisissez le titre de l’action.'; toast.add({ severity: 'warn', summary: 'Titre obligatoire', detail: actionError.value, life: 4500 }); return; }
    if (!actionForm.value.ownerId) { actionError.value = 'Choisissez un responsable.'; toast.add({ severity: 'warn', summary: 'Responsable obligatoire', detail: actionError.value, life: 4500 }); return; }
    actionSubmitting.value = true;
    try {
        await createAction(itemId.value, {
            title: actionForm.value.title.trim(),
            description: actionForm.value.description || undefined,
            actionType: actionForm.value.actionType,
            impact: actionForm.value.impact || undefined,
            dueDate: actionForm.value.dueDate || undefined,
            ownerId: actionForm.value.ownerId,
        });
        actionDialog.value = false;
        actionForm.value = { title: '', description: '', actionType: 'ANALYSE_IMPACT', impact: '', dueDate: '', ownerId: null };
        success.value = 'Action créée.';
        actionSuccess(toast, 'Action créée', 'La nouvelle action de suivi a été enregistrée.');
        await load();
    } catch (e: any) {
        const message = e.response?.data?.message;
        actionError.value = Array.isArray(message) ? message.join(' ') : message ?? 'Création impossible.';
        showActionError(toast, e, 'Création impossible', 'L’action de suivi n’a pas pu être créée.');
    } finally {
        actionSubmitting.value = false;
    }
}

async function openEditAction(action: FollowUpAction) {
    if (!canManageAction(action)) return;
    editActionError.value = '';
    editingAction.value = action;
    editActionForm.value = {
        title: action.title,
        description: action.description ?? '',
        actionType: action.actionType,
        impact: action.impact ?? '',
        dueDate: action.dueDate ?? '',
        ownerId: action.owner?.id ?? null,
    };
    editActionDialog.value = true;
    if (!users.value.length) await loadAssignableUsers();
}

async function submitActionEdit() {
    const action = editingAction.value;
    if (!action || editActionSubmitting.value) return;
    if (!editActionForm.value.title.trim()) {
        editActionError.value = 'Saisissez le titre de l’action.';
        return;
    }
    if (!editActionForm.value.ownerId) {
        editActionError.value = 'Choisissez un responsable.';
        return;
    }

    editActionSubmitting.value = true;
    editActionError.value = '';
    try {
        await updateAction(action.id, {
            title: editActionForm.value.title.trim(),
            description: editActionForm.value.description,
            actionType: editActionForm.value.actionType,
            impact: editActionForm.value.impact,
            dueDate: editActionForm.value.dueDate || null,
            ownerId: editActionForm.value.ownerId,
        });
        editActionDialog.value = false;
        editingAction.value = null;
        actionSuccess(toast, 'Action modifiée', 'Les informations de l’action ont été mises à jour.');
        await load();
    } catch (e: any) {
        editActionError.value = e.response?.data?.message ?? 'Modification impossible.';
        showActionError(toast, e, 'Modification impossible', 'L’action de suivi n’a pas pu être modifiée.');
    } finally {
        editActionSubmitting.value = false;
    }
}

function askDeleteAction(action: FollowUpAction) {
    if (!canManageAction(action)) return;
    actionToDelete.value = action;
    deleteActionDialog.value = true;
}

async function confirmDeleteAction() {
    const action = actionToDelete.value;
    if (!action || actionDeleting.value) return;
    actionDeleting.value = true;
    try {
        await deleteAction(action.id);
        deleteActionDialog.value = false;
        actionToDelete.value = null;
        actionSuccess(toast, 'Action supprimée', `L’action « ${action.title} » a été supprimée.`);
        await load();
    } catch (e: any) {
        showActionError(toast, e, 'Suppression impossible', 'L’action de suivi n’a pas pu être supprimée.');
    } finally {
        actionDeleting.value = false;
    }
}

async function changeActionStatus(action: FollowUpAction, status: string) { try { await updateAction(action.id, { status }); actionSuccess(toast, status === 'DONE' ? 'Action terminée' : 'Action démarrée', `Le statut de l’action « ${action.title} » a été mis à jour.`); await load(); } catch (e: any) { error.value = e.response?.data?.message ?? 'Modification impossible.'; showActionError(toast, e, 'Modification impossible', 'Le statut de l’action n’a pas pu être modifié.'); } }
onMounted(load);
</script>

<template>
    <AppLayout>
        <div class="mx-auto max-w-6xl space-y-6">
            <div class="flex items-center justify-between">
                <h2 class="text-2xl font-bold">Détail de la veille</h2>
                <Button label="Retour" severity="secondary" @click="router.push('/watch-items')">
                    <template #icon>
                        <ArrowLeftIcon size="0.9rem" />
                    </template>
                </Button>
            </div>
            <Message v-if="error" severity="error">{{ error }}</Message>
            <Message v-if="success" severity="success">{{ success }}</Message>
            <AppSpinner v-if="loading" size="large" centered label="Chargement de la veille…" />
            <template v-else-if="item">
                <Card><template #title>{{ item.title }}</template><template #subtitle>Source : {{ item.source?.name
                        }}</template><template #content>
                        <div class="space-y-4">
                            <div class="flex flex-wrap gap-4">
                                <Tag :value="labelFr(item.status)" /><span>Priorité : <strong>{{ item.relevance ?? '-'
                                        }}</strong></span><span>Criticité : <strong>{{ item.criticality ?? '-'
                                        }}</strong></span>
                            </div>
                            <p class="whitespace-pre-line text-slate-600">{{ item.summary || 'Aucun résumé.' }}</p><a
                                v-if="item.url" :href="item.url" target="_blank" rel="noopener noreferrer"
                                class="text-blue-600 underline">Consulter la source</a>
                        </div>
                    </template>
                </Card>
                <Card v-if="canValidate"><template #title>Décision</template><template #content>
                        <div class="flex flex-wrap gap-3"><template v-if="item.status === 'A_QUALIFIER'"><Button
                                    label="Valider" severity="success" @click="openReview('VALIDATE')" /><Button
                                    label="Rejeter" severity="danger" @click="openReview('REJECT')" /></template><Button
                                v-if="item.status === 'VALIDE'" label="Publier" @click="publish" /><Button
                                v-if="item.status === 'PUBLIE'" label="Archiver" severity="secondary"
                                @click="archive" />
                        </div>
                    </template></Card>
                <Card v-if="canViewReviews"><template #title>Historique des décisions</template><template #content>
                        <div class="relative mb-3 max-w-md">
                            <SearchIcon
                                class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                size="0.85rem" />
                            <InputText v-model="reviewSearch" class="thin-search w-full !pl-9"
                                placeholder="Rechercher dans l’historique..." />
                        </div>
                        <DataTable :value="filteredReviews" paginator :rows="10">
                            <template #empty>Aucune décision ne correspond à la recherche.</template>
                            <Column header="Décision"><template #body="{ data }">{{ labelFr(data.status) }}</template>
                            </Column>
                            <Column header="Criticité"><template #body="{ data }">{{ labelFr(data.criticality)
                            }}</template></Column>
                            <Column field="relevance" header="Priorité" />
                            <Column field="comment" header="Commentaire" />
                            <Column header="Auteur"><template #body="{ data }">{{ data.reviewer?.email }}</template>
                            </Column>
                            <Column header="Date"><template #body="{ data }">{{ formatDate(data.reviewedAt)
                            }}</template></Column>
                        </DataTable>
                    </template>
                </Card>
                <Card v-if="canCreateAction"><template #title>Actions de suivi</template><template #content>
                        <div class="space-y-4">
                            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div class="relative min-w-0 flex-1 sm:max-w-md">
                                    <SearchIcon
                                        class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                        size="0.85rem" />
                                    <InputText v-model="actionSearch" class="thin-search w-full !pl-9"
                                        placeholder="Rechercher une action..." />
                                </div>
                                <Button v-if="canCreateActionForCurrentStatus" label="Créer une action"
                                    @click="openActionDialog"><template #icon>
                                        <PlusIcon size="0.9rem" />
                                    </template></Button>
                            </div>
                            <Message :severity="canCreateActionForCurrentStatus ? 'info' : 'warn'" :closable="false">
                                {{ actionCreationHelp }}
                            </Message>
                            <DataTable :value="filteredActions">
                                <template #empty>Aucune action ne correspond à la recherche.</template>
                                <Column field="title" header="Action" />
                                <Column header="Type"><template #body="{ data }">{{ labelFr(data.actionType)
                                }}</template></Column>
                                <Column header="Responsable"><template #body="{ data }">{{ actionOwnerName(data)
                                }}</template>
                                </Column>
                                <Column header="Échéance"><template #body="{ data }">{{ formatDate(data.dueDate, false)
                                }}</template></Column>
                                <Column header="Statut"><template #body="{ data }">
                                        <Tag :value="labelFr(data.status)" />
                                    </template></Column>
                                <Column header="Actions"><template #body="{ data }">
                                        <div class="flex flex-nowrap gap-1.5"><Button
                                                v-if="data.status === 'OPEN' && canManageAction(data)" label="Démarrer"
                                                size="small" @click="changeActionStatus(data, 'IN_PROGRESS')" /><Button
                                                v-if="data.status === 'IN_PROGRESS' && canManageAction(data)"
                                                label="Terminer" size="small" severity="success"
                                                @click="changeActionStatus(data, 'DONE')" />
                                            <Button v-if="canManageAction(data)" severity="secondary" rounded
                                                size="small" title="Modifier l’action" aria-label="Modifier l’action"
                                                @click="openEditAction(data)">
                                                <template #icon>
                                                    <PencilIcon size="0.85rem" />
                                                </template>
                                            </Button>
                                            <Button v-if="canManageAction(data)" severity="danger" text rounded
                                                size="small" title="Supprimer l’action" aria-label="Supprimer l’action"
                                                @click="askDeleteAction(data)">
                                                <template #icon>
                                                    <TrashIcon size="0.85rem" />
                                                </template>
                                            </Button>
                                        </div>
                                    </template>
                                </Column>
                            </DataTable>
                        </div>
                    </template>
                </Card>
            </template>
            <Dialog v-model:visible="reviewDialog" modal
                :header="reviewDecision === 'VALIDATE' ? 'Valider la veille' : 'Rejeter la veille'"
                class="w-full max-w-xl">
                <form class="space-y-4" @submit.prevent="submitReview">

                    <div class="space-y-4">
                        <div class="flex items-center justify-between">
                            <label class="font-semibold">
                                Priorité globale
                            </label>

                            <strong :style="{ color: reviewPriorityColor }">
                                {{ reviewPriorityScore }} / 100
                            </strong>
                        </div>

                        <Slider v-model="reviewPriorityScore" :min="0" :max="100" :step="1" class="w-full" />

                        <div class="grid grid-cols-5 text-xs text-slate-500">
                            <span>0</span>
                            <span class="text-center">25</span>
                            <span class="text-center">50</span>
                            <span class="text-center">75</span>
                            <span class="text-right">100</span>
                        </div>

                        <div class="rounded-lg p-3 text-center font-semibold text-white"
                            :style="{ backgroundColor: reviewPriorityColor }">
                            {{ reviewPriorityLabel }}
                        </div>
                    </div>
                    <div><label class="mb-2 block"
                            :class="{ 'required-label': reviewDecision === 'REJECT' }">Commentaire</label><Textarea
                            v-model="reviewForm.comment" rows="5" class="w-full"
                            :required="reviewDecision === 'REJECT'" /></div>
                    <div class="flex justify-end gap-3"><Button type="button" label="Annuler" severity="secondary"
                            @click="reviewDialog = false" /><Button type="submit"
                            :label="reviewDecision === 'VALIDATE' ? 'Valider' : 'Rejeter'"
                            :severity="reviewDecision === 'VALIDATE' ? 'success' : 'danger'" /></div>
                </form>
            </Dialog>
            <Dialog v-model:visible="actionDialog" modal header="Nouvelle action" class="w-full max-w-2xl">
                <form class="space-y-4" @submit.prevent="submitAction">
                    <Message v-if="actionError" severity="error" closable @close="actionError = ''">
                        {{ actionError }}
                    </Message>
                    <div><label class="required-label mb-2 block">Titre</label>
                        <InputText v-model="actionForm.title" class="w-full" required />
                    </div>
                    <div><label class="mb-2 block">Description</label><Textarea v-model="actionForm.description"
                            rows="4" class="w-full" /></div>
                    <div class="grid gap-4 md:grid-cols-2">
                        <div><label class="required-label mb-2 block">Type</label><Select append-to="self"
                                v-model="actionForm.actionType" :options="optionsFr(actionTypes)" option-label="label"
                                option-value="value" class="w-full" /></div>
                        <div><label class="required-label mb-2 block">Responsable</label><Select append-to="self"
                                v-model="actionForm.ownerId" :options="userOptions" option-label="label"
                                option-value="id" filter :loading="usersLoading" placeholder="Choisir un responsable"
                                class="w-full" /></div>
                    </div>
                    <Message v-if="!usersLoading && !userOptions.length" severity="warn">
                        Aucun utilisateur actif ne peut être désigné comme responsable.
                    </Message>
                    <div><label class="mb-2 block">Impact</label><Textarea v-model="actionForm.impact" rows="3"
                            class="w-full" />
                    </div>
                    <div><label class="mb-2 block">Échéance</label>
                        <InputText v-model="actionForm.dueDate" type="date" class="w-full" />
                    </div>
                    <div class="flex justify-end gap-3"><Button type="button" label="Annuler" severity="secondary"
                            @click="actionDialog = false" /><Button type="submit" label="Créer l'action"
                            :loading="actionSubmitting" :disabled="usersLoading || !userOptions.length" /></div>
                </form>
            </Dialog>

            <Dialog v-model:visible="editActionDialog" modal header="Modifier l’action" class="w-full max-w-2xl"
                :closable="!editActionSubmitting" :close-on-escape="!editActionSubmitting">
                <form class="space-y-4" @submit.prevent="submitActionEdit">
                    <Message v-if="editActionError" severity="error">{{ editActionError }}</Message>
                    <div><label class="required-label mb-2 block">Titre</label>
                        <InputText v-model="editActionForm.title" class="w-full" required
                            :disabled="editActionSubmitting" />
                    </div>
                    <div><label class="mb-2 block">Description</label>
                        <Textarea v-model="editActionForm.description" rows="4" class="w-full"
                            :disabled="editActionSubmitting" />
                    </div>
                    <div class="grid gap-4 md:grid-cols-2">
                        <div><label class="required-label mb-2 block">Type</label>
                            <Select append-to="self" v-model="editActionForm.actionType"
                                :options="optionsFr(actionTypes)" option-label="label" option-value="value"
                                class="w-full" :disabled="editActionSubmitting" />
                        </div>
                        <div><label class="required-label mb-2 block">Responsable</label>
                            <Select append-to="self" v-model="editActionForm.ownerId" :options="userOptions"
                                option-label="label" option-value="id" filter class="w-full" :loading="usersLoading"
                                :disabled="editActionSubmitting || (!roles.includes('ADMIN') && !roles.includes('RESPONSABLE_VEILLE'))" />
                        </div>
                    </div>
                    <div><label class="mb-2 block">Impact</label>
                        <Textarea v-model="editActionForm.impact" rows="3" class="w-full"
                            :disabled="editActionSubmitting" />
                    </div>
                    <div><label class="mb-2 block">Échéance</label>
                        <InputText v-model="editActionForm.dueDate" type="date" class="w-full"
                            :disabled="editActionSubmitting" />
                    </div>
                    <div class="flex justify-end gap-3">
                        <Button type="button" label="Annuler" severity="secondary" :disabled="editActionSubmitting"
                            @click="editActionDialog = false" />
                        <Button type="submit" label="Enregistrer les modifications" :loading="editActionSubmitting" />
                    </div>
                </form>
            </Dialog>

            <Dialog v-model:visible="deleteActionDialog" modal header="Confirmer la suppression" class="w-full max-w-md"
                :closable="!actionDeleting" :close-on-escape="!actionDeleting">
                <div class="space-y-5">
                    <p v-if="actionToDelete">
                        Êtes-vous sûr de vouloir supprimer l’action <strong>« {{ actionToDelete.title }} »</strong> ?
                    </p>
                    <Message severity="warn" :closable="false">Cette suppression est définitive.</Message>
                    <div class="flex justify-end gap-3">
                        <Button label="Annuler" severity="secondary" :disabled="actionDeleting"
                            @click="deleteActionDialog = false" />
                        <Button label="Supprimer" severity="danger" :loading="actionDeleting"
                            @click="confirmDeleteAction">
                            <template #icon>
                                <TrashIcon size="0.9rem" />
                            </template>
                        </Button>
                    </div>
                </div>
            </Dialog>
        </div>
    </AppLayout>
</template>

<style scoped>
.thin-search.p-inputtext {
    padding-block: 0.38rem;
    font-size: 0.8rem;
}
</style>
