<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import MultiSelect from 'primevue/multiselect';
import Password from 'primevue/password';
import Message from 'primevue/message';
import Tag from 'primevue/tag';
import { useToast } from 'primevue/usetoast';
import { isAxiosError } from 'axios';
import PauseCircleIcon from '@primeicons/vue/pause-circle';
import PlayCircleIcon from '@primeicons/vue/play-circle';
import PlusIcon from '@primeicons/vue/plus';
import UserEditIcon from '@primeicons/vue/user-edit';

import AppLayout from '../layouts/AppLayout.vue';
import api from '../services/api';
import { labelFr } from '../i18n/labels';
import { useAuthStore } from '../stores/auth';
import { actionError, actionSuccess } from '../utils/action-toast';

interface UserRole {
  id: number;
  name: string;
  description: string | null;
}

interface UserRow {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  status: 'ACTIVE' | 'INACTIVE';
  roles: UserRole[];
}

const auth = useAuthStore();
const toast = useToast();
const users = ref<UserRow[]>([]);
const availableRoles = ref<UserRole[]>([]);
const loading = ref(false);
const statusError = ref('');
const changingStatus = ref<number[]>([]);

const dialogVisible = ref(false);
const creating = ref(false);
const error = ref('');
const form = ref({
  firstName: '', lastName: '', email: '', password: '', roles: [] as string[],
});

const roleDialogVisible = ref(false);
const selectedUser = ref<UserRow | null>(null);
const selectedRoleNames = ref<string[]>([]);
const roleError = ref('');
const savingRoles = ref(false);
const roleOptions = computed(() =>
  availableRoles.value.map((role) => ({
    label: labelFr(role.name),
    value: role.name,
  })),
);

function selectedRolesLabel(value: string[] | undefined, placeholder: string) {
  if (!value?.length) return placeholder;
  if (value.length === availableRoles.value.length) return 'Tous les rôles';
  return value.map((role) => labelFr(role)).join(', ');
}

function resetCreateForm() {
  form.value = {
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    roles: [],
  };
  error.value = '';
}

function openCreateDialog() {
  resetCreateForm();
  dialogVisible.value = true;
}

function rolesLabel(roles: UserRole[]) {
  if (availableRoles.value.length > 0 && roles.length === availableRoles.value.length) {
    return 'Tous les rôles';
  }

  return roles.map((role) => labelFr(role.name)).join(', ');
}

function apiError(err: unknown, fallback: string) {
  const message = isAxiosError(err) ? err.response?.data?.message : undefined;
  return typeof message === 'string' ? message : fallback;
}

async function loadUsers() {
  loading.value = true;
  statusError.value = '';
  try {
    const [usersResponse, rolesResponse] = await Promise.all([
      api.get<UserRow[]>('/users'),
      api.get<UserRole[]>('/roles'),
    ]);
    users.value = usersResponse.data;
    availableRoles.value = rolesResponse.data;
  } catch (err: unknown) {
    statusError.value = apiError(err, 'Impossible de charger les utilisateurs et les rôles.');
  } finally {
    loading.value = false;
  }
}

async function createUser() {
  if (creating.value) return;
  error.value = '';
  creating.value = true;
  try {
    await api.post('/users', form.value);
    dialogVisible.value = false;
    resetCreateForm();
    await loadUsers();
    toast.add({ severity: 'success', summary: 'Utilisateur créé', detail: 'Le compte a été créé avec succès.', life: 5000 });
  } catch (err: unknown) {
    error.value = apiError(err, 'Création impossible.');
    actionError(toast, err, 'Création impossible', 'Le compte utilisateur n’a pas pu être créé.');
  } finally {
    creating.value = false;
  }
}

function editRoles(user: UserRow) {
  selectedUser.value = user;
  selectedRoleNames.value = user.roles.map((role) => role.name);
  roleError.value = '';
  roleDialogVisible.value = true;
}

async function saveRoles() {
  const user = selectedUser.value;
  if (!user || savingRoles.value) return;
  roleError.value = '';
  if (!selectedRoleNames.value.length) {
    roleError.value = 'Sélectionne au moins un rôle.';
    return;
  }
  if (user.id === auth.user?.id && !selectedRoleNames.value.includes('ADMIN')) {
    roleError.value = 'Vous devez conserver votre propre rôle Administrateur.';
    return;
  }

  savingRoles.value = true;
  try {
    const response = await api.patch<{ id: number; roles: UserRole[] }>(
      `/users/${user.id}/roles`,
      { roles: selectedRoleNames.value },
    );
    user.roles = response.data.roles;
    if (user.id === auth.user?.id) {
      auth.user.roles = response.data.roles.map((role) => role.name);
    }
    roleDialogVisible.value = false;
    toast.add({
      severity: 'success',
      summary: 'Rôles modifiés',
      detail: `Les rôles de ${user.firstName} ${user.lastName} ont été enregistrés.`,
      life: 5000,
    });
  } catch (err: unknown) {
    roleError.value = apiError(err, 'Impossible de modifier les rôles de cet utilisateur.');
    actionError(toast, err, 'Modification impossible', 'Les rôles de cet utilisateur n’ont pas pu être modifiés.');
  } finally {
    savingRoles.value = false;
  }
}

async function changeStatus(id: number, status: 'ACTIVE' | 'INACTIVE') {
  if (!auth.isAdmin || changingStatus.value.includes(id)) return;
  statusError.value = '';
  changingStatus.value.push(id);
  try {
    const response = await api.patch<{ id: number; status: UserRow['status'] }>(`/users/${id}/status`, { status });
    const user = users.value.find((item) => item.id === id);
    if (user) user.status = response.data.status;
    actionSuccess(
      toast,
      status === 'ACTIVE' ? 'Compte réactivé' : 'Compte désactivé',
      status === 'ACTIVE'
        ? 'L’utilisateur peut de nouveau accéder à l’application.'
        : 'L’accès de l’utilisateur a été désactivé.',
    );
  } catch (err: unknown) {
    statusError.value = apiError(err, 'Impossible de modifier le statut du compte.');
    actionError(toast, err, 'Modification impossible', 'Le statut du compte n’a pas pu être modifié.');
  } finally {
    changingStatus.value = changingStatus.value.filter((item) => item !== id);
  }
}

onMounted(loadUsers);
</script>

<template>
  <AppLayout>
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold text-slate-900">Utilisateurs</h2>
          <p class="text-slate-700">Gestion des comptes et rôles.</p>
        </div>
        <Button label="Ajouter un utilisateur" @click="openCreateDialog">
          <template #icon><PlusIcon size="0.9rem" /></template>
        </Button>
      </div>

      <Message v-if="statusError" severity="error">{{ statusError }}</Message>

      <div class="rounded-xl bg-white p-5 shadow-sm">
        <DataTable :value="users" :loading="loading" data-key="id" paginator :rows="10">
          <Column field="id" header="Identifiant" />
          <Column field="firstName" header="Prénom" />
          <Column field="lastName" header="Nom" />
          <Column field="email" header="Adresse électronique" />
          <Column header="Rôles">
            <template #body="{ data }">
              {{ rolesLabel(data.roles) }}
            </template>
          </Column>
          <Column header="Statut">
            <template #body="{ data }">
              <Tag :value="labelFr(data.status)" :severity="data.status === 'ACTIVE' ? 'success' : 'secondary'" />
            </template>
          </Column>
          <Column v-if="auth.isAdmin" header="Actions">
            <template #body="{ data }">
              <div class="flex flex-wrap gap-2">
                <Button label="Modifier les rôles" severity="secondary" size="small" @click="editRoles(data)">
                  <template #icon><UserEditIcon size="0.9rem" /></template>
                </Button>
                <Button v-if="data.status === 'ACTIVE'" label="Désactiver" severity="danger" size="small"
                  :loading="changingStatus.includes(data.id)"
                  :disabled="data.id === auth.user?.id || changingStatus.includes(data.id)"
                  :title="data.id === auth.user?.id ? 'Vous ne pouvez pas désactiver votre propre compte.' : undefined"
                  @click="changeStatus(data.id, 'INACTIVE')">
                  <template #icon><PauseCircleIcon size="0.9rem" /></template>
                </Button>
                <Button v-else label="Réactiver" severity="success" size="small"
                  :loading="changingStatus.includes(data.id)" :disabled="changingStatus.includes(data.id)"
                  @click="changeStatus(data.id, 'ACTIVE')">
                  <template #icon><PlayCircleIcon size="0.9rem" /></template>
                </Button>
              </div>
            </template>
          </Column>
        </DataTable>
      </div>

      <Dialog v-model:visible="roleDialogVisible" modal header="Modifier les rôles" position="center" class="role-dialog"
        :style="{ width: '36rem', maxWidth: 'calc(100vw - 2rem)' }" :draggable="false"
        :closable="!savingRoles" :close-on-escape="!savingRoles">
        <form class="space-y-5" @submit.prevent="saveRoles">
          <p v-if="selectedUser" class="font-medium text-slate-600 dark:text-slate-300">
            {{ selectedUser.firstName }} {{ selectedUser.lastName }} — {{ selectedUser.email }}
          </p>
          <Message v-if="roleError" severity="error">{{ roleError }}</Message>
          <div>
            <p class="required-label mb-2 font-medium">Rôles attribués</p>
            <MultiSelect append-to="self" v-model="selectedRoleNames" :options="roleOptions" option-label="label" option-value="value"
              filter class="w-full" placeholder="Sélectionner les rôles" scroll-height="16rem"
              :disabled="savingRoles">
              <template #value="{ value, placeholder }">
                <span :class="{ 'p-placeholder': !value?.length }">
                  {{ selectedRolesLabel(value, placeholder) }}
                </span>
              </template>
            </MultiSelect>
          </div>
          <Message v-if="selectedUser?.id === auth.user?.id" severity="info" :closable="false">
            Vous pouvez ajouter des rôles à votre compte, mais vous devez conserver le rôle Administrateur.
          </Message>
          <div class="flex justify-end gap-3">
            <Button type="button" label="Annuler" severity="secondary" :disabled="savingRoles"
              @click="roleDialogVisible = false" />
            <Button type="submit" label="Enregistrer les rôles" :loading="savingRoles" :disabled="savingRoles" />
          </div>
        </form>
      </Dialog>

      <Dialog v-model:visible="dialogVisible" modal header="Nouvel utilisateur" class="w-full max-w-xl"
        :closable="!creating" :close-on-escape="!creating" @after-hide="resetCreateForm">
        <form class="space-y-4" autocomplete="off" @submit.prevent="createUser">
          <Message v-if="error" severity="error">{{ error }}</Message>
          <div class="grid gap-4 md:grid-cols-2">
            <div><label class="required-label mb-2 block">Prénom</label><InputText v-model="form.firstName" class="w-full" required /></div>
            <div><label class="required-label mb-2 block">Nom</label><InputText v-model="form.lastName" class="w-full" required /></div>
          </div>
          <div><label class="required-label mb-2 block">Adresse électronique</label><InputText v-model="form.email"
              name="new-user-email" type="email" autocomplete="off" class="w-full" required /></div>
          <div>
            <label class="required-label mb-2 block">Mot de passe</label>
            <Password v-model="form.password" :minlength="12" toggle-mask fluid required
              :input-props="{ name: 'new-user-password', autocomplete: 'new-password' }" />
            <p class="mt-2 text-sm text-slate-500">
              12 caractères minimum, avec une majuscule, une minuscule, un chiffre et un caractère spécial.
            </p>
          </div>
          <div>
            <p class="required-label mb-2">Rôles</p>
            <MultiSelect append-to="self" v-model="form.roles" :options="roleOptions" option-label="label" option-value="value"
              filter class="w-full" placeholder="Sélectionner les rôles">
              <template #value="{ value, placeholder }">
                <span :class="{ 'p-placeholder': !value?.length }">
                  {{ selectedRolesLabel(value, placeholder) }}
                </span>
              </template>
            </MultiSelect>
          </div>
          <div class="flex justify-end gap-3">
            <Button type="button" label="Annuler" severity="secondary" :disabled="creating" @click="dialogVisible = false" />
            <Button type="submit" label="Créer" :loading="creating" :disabled="creating" />
          </div>
        </form>
      </Dialog>
    </div>
  </AppLayout>
</template>

<style>
.role-dialog,
.role-dialog .p-dialog-content {
  overflow: visible !important;
}

.role-dialog .p-multiselect-overlay {
  z-index: 2;
}
</style>
