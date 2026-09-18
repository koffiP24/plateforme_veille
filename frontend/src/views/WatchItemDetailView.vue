<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Button from 'primevue/button'; import Card from 'primevue/card'; import Column from 'primevue/column'; import DataTable from 'primevue/datatable'; import Dialog from 'primevue/dialog'; import InputNumber from 'primevue/inputnumber'; import InputText from 'primevue/inputtext'; import Message from 'primevue/message'; import Select from 'primevue/select'; import Tag from 'primevue/tag'; import Textarea from 'primevue/textarea';
import AppLayout from '../layouts/AppLayout.vue';
import { labelFr, optionsFr } from '../i18n/labels';
import { useAuthStore } from '../stores/auth';
import { getWatchItem, type WatchItem } from '../services/watch-items.service';
import { archiveWatchItem, getReviews, publishWatchItem, reviewWatchItem, type Review } from '../services/validation.service';
import { createAction, getActions, updateAction, type FollowUpAction } from '../services/actions.service';
import { getUsers, type AssignableUser } from '../services/users.service';

const route = useRoute(); const router = useRouter(); const auth = useAuthStore();
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
const reviewForm = ref({ relevance: null as number | null, criticality: null as string | null, comment: '' });
const criticalityOptions = ['FAIBLE', 'MOYENNE', 'ELEVEE', 'CRITIQUE'];
const actionDialog = ref(false); const actionTypes = ['ANALYSE_IMPACT', 'MISE_A_JOUR_METHODE', 'FORMATION', 'VERIFICATION', 'AUTRE'];
const actionForm = ref({ title: '', description: '', actionType: 'ANALYSE_IMPACT', impact: '', dueDate: '', ownerId: null as number | null });
const actionError = ref(''); const actionSubmitting = ref(false);
const itemId = computed(() => Number(route.params.id));

async function load() {
    loading.value = true; error.value = '';
    try {
        const i = await getWatchItem(itemId.value);
        item.value = i.data;
        reviews.value = canViewReviews.value ? (await getReviews(itemId.value)).data : [];
        reviewForm.value.relevance = item.value.relevance; reviewForm.value.criticality = item.value.criticality;
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
function openReview(decision: 'VALIDATE' | 'REJECT') { reviewDecision.value = decision; reviewForm.value = { relevance: item.value?.relevance ?? null, criticality: item.value?.criticality ?? null, comment: '' }; reviewDialog.value = true; }
async function submitReview() { try { await reviewWatchItem(itemId.value, { decision: reviewDecision.value, relevance: reviewForm.value.relevance ?? undefined, criticality: reviewForm.value.criticality ?? undefined, comment: reviewForm.value.comment || undefined }); reviewDialog.value = false; success.value = reviewDecision.value === 'VALIDATE' ? 'Élément validé.' : 'Élément rejeté.'; await load(); } catch (e: any) { error.value = e.response?.data?.message ?? 'Décision impossible.'; } }
async function publish() { try { await publishWatchItem(itemId.value, 'Publication validée.'); success.value = 'Élément publié.'; await load(); } catch (e: any) { error.value = e.response?.data?.message ?? 'Publication impossible.'; } }
async function archive() { try { await archiveWatchItem(itemId.value, 'Archivage.'); success.value = 'Élément archivé.'; await load(); } catch (e: any) { error.value = e.response?.data?.message ?? 'Archivage impossible.'; } }
async function submitAction() {
    actionError.value = '';
    if (!actionForm.value.title.trim()) { actionError.value = 'Saisissez le titre de l’action.'; return; }
    if (!actionForm.value.ownerId) { actionError.value = 'Choisissez un responsable.'; return; }
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
        await load();
    } catch (e: any) {
        const message = e.response?.data?.message;
        actionError.value = Array.isArray(message) ? message.join(' ') : message ?? 'Création impossible.';
    } finally {
        actionSubmitting.value = false;
    }
}
async function changeActionStatus(action: FollowUpAction, status: string) { try { await updateAction(action.id, { status }); await load(); } catch (e: any) { error.value = e.response?.data?.message ?? 'Modification impossible.'; } }
onMounted(load);
</script>

<template>
    <AppLayout>
        <div class="mx-auto max-w-6xl space-y-6">
            <div class="flex items-center justify-between">
                <h2 class="text-2xl font-bold">Détail de la veille</h2>
                <Button label="Retour" severity="secondary" @click="router.push('/watch-items')" />
            </div>
            <Message v-if="error" severity="error">{{ error }}</Message>
            <Message v-if="success" severity="success">{{ success }}</Message>
            <div v-if="loading">Chargement...</div>
            <template v-else-if="item">
                <Card><template #title>{{ item.title }}</template><template #subtitle>Source : {{ item.source?.name
                        }}</template><template #content>
                        <div class="space-y-4">
                            <div class="flex flex-wrap gap-4">
                                <Tag :value="labelFr(item.status)" /><span>Pertinence : <strong>{{ item.relevance ?? '-'
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
                                v-if="item.status === 'PUBLIE'" label="Archiver" severity="secondary" @click="archive" />
                        </div>
                    </template></Card>
                <Card v-if="canViewReviews"><template #title>Historique des décisions</template><template #content>
                        <DataTable :value="reviews" paginator :rows="10">
                            <Column header="Décision"><template #body="{ data }">{{ labelFr(data.status) }}</template></Column>
                            <Column header="Criticité"><template #body="{ data }">{{ labelFr(data.criticality) }}</template></Column>
                            <Column field="relevance" header="Pertinence" />
                            <Column field="comment" header="Commentaire" />
                            <Column header="Auteur"><template #body="{ data }">{{ data.reviewer?.email }}</template>
                            </Column>
                            <Column field="reviewedAt" header="Date" />
                        </DataTable>
                    </template>
                </Card>
                <Card v-if="canCreateAction"><template #title>Actions de suivi</template><template #content>
                        <div class="space-y-4">
                            <div class="flex justify-end"><Button label="Créer une action" icon="pi pi-plus"
                                    @click="openActionDialog" /></div>
                            <DataTable :value="actions">
                                <Column field="title" header="Action" />
                                <Column header="Type"><template #body="{ data }">{{ labelFr(data.actionType) }}</template></Column>
                                <Column header="Responsable"><template #body="{ data }">{{ data.owner?.email }}</template>
                                </Column>
                                <Column field="dueDate" header="Échéance" />
                                <Column header="Statut"><template #body="{ data }">
                                        <Tag :value="labelFr(data.status)" />
                                    </template></Column>
                                <Column header="Actions"><template #body="{ data }">
                                        <div class="flex gap-2"><Button v-if="data.status === 'OPEN'" label="Démarrer"
                                                size="small" @click="changeActionStatus(data, 'IN_PROGRESS')" /><Button
                                                v-if="data.status === 'IN_PROGRESS'" label="Terminer" size="small"
                                                severity="success" @click="changeActionStatus(data, 'DONE')" /></div>
                                    </template>
                                </Column>
                            </DataTable>
                        </div>
                    </template>
                </Card>
            </template>
            <Dialog v-model:visible="reviewDialog" modal
                :header="reviewDecision === 'VALIDATE' ? 'Valider la veille' : 'Rejeter la veille'" class="w-full max-w-xl">
                <form class="space-y-4" @submit.prevent="submitReview">
                    <div><label class="mb-2 block">Pertinence</label>
                        <InputNumber v-model="reviewForm.relevance" :min="0" :max="100" class="w-full" />
                    </div>
                    <div><label class="mb-2 block">Criticité</label><Select v-model="reviewForm.criticality"
                            :options="optionsFr(criticalityOptions)" option-label="label" option-value="value" class="w-full" /></div>
                    <div><label class="mb-2 block">Commentaire</label><Textarea v-model="reviewForm.comment" rows="5"
                            class="w-full" :required="reviewDecision === 'REJECT'" /></div>
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
                    <div><label class="mb-2 block">Titre</label>
                        <InputText v-model="actionForm.title" class="w-full" required />
                    </div>
                    <div><label class="mb-2 block">Description</label><Textarea v-model="actionForm.description"
                            rows="4" class="w-full" /></div>
                    <div class="grid gap-4 md:grid-cols-2">
                        <div><label class="mb-2 block">Type</label><Select v-model="actionForm.actionType"
                                :options="optionsFr(actionTypes)" option-label="label" option-value="value" class="w-full" /></div>
                        <div><label class="mb-2 block">Responsable</label><Select v-model="actionForm.ownerId"
                                :options="userOptions" option-label="label" option-value="id" filter
                                :loading="usersLoading" placeholder="Choisir un responsable" class="w-full" /></div>
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
        </div>
    </AppLayout>
</template>
