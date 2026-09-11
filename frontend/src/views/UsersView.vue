<script setup lang="ts">
import {
  onMounted,
  ref,
} from 'vue';

import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import MultiSelect from 'primevue/multiselect';
import Message from 'primevue/message';
import Tag from 'primevue/tag';
import { isAxiosError } from 'axios';

import AppLayout from '../layouts/AppLayout.vue';
import api from '../services/api';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const statusError = ref('');
const changingStatus = ref<number[]>([]);

const users = ref<any[]>([]);
const loading = ref(false);

const dialogVisible = ref(false);
const error = ref('');

const roleOptions = [
  'ADMIN',
  'RESPONSABLE_VEILLE',
  'REFERENT_LABORATOIRE',
  'LECTEUR',
  'OPERATEUR_VEILLE',
];

const form = ref({
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  roles: [] as string[],
});

async function loadUsers() {
  loading.value = true;

  try {
    const response =
      await api.get('/users');

    users.value = response.data;
  } finally {
    loading.value = false;
  }
}

async function createUser() {
  error.value = '';

  try {
    await api.post(
      '/users',
      form.value,
    );

    dialogVisible.value = false;

    form.value = {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      roles: [],
    };

    await loadUsers();
  } catch (err: any) {
    error.value =
      err.response?.data?.message ??
      'Création impossible';
  }
}

async function changeStatus(id: number, status: 'ACTIVE' | 'INACTIVE') {
  if (!auth.isAdmin || changingStatus.value.includes(id)) return;
  statusError.value = '';
  changingStatus.value.push(id);
  try {
    const response = await api.patch<{ id: number; status: string }>(`/users/${id}/status`, { status });
    const user = users.value.find((item) => item.id === id);
    if (user) user.status = response.data.status;
  } catch (err: unknown) {
    const message = isAxiosError(err) ? err.response?.data?.message : undefined;
    statusError.value = typeof message === 'string' ? message : 'Impossible de modifier le statut du compte.';
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
          <h2 class="text-2xl font-bold">
            Utilisateurs
          </h2>

          <p class="text-slate-500">
            Gestion des comptes et rôles.
          </p>
        </div>

        <Button label="Ajouter un utilisateur" icon="pi pi-plus" @click="dialogVisible = true" />
      </div>

      <Message v-if="statusError" severity="error">{{ statusError }}</Message>

      <div class="rounded-xl bg-white p-5 shadow-sm">
        <DataTable :value="users" :loading="loading" paginator :rows="10">
          <Column field="id" header="ID" />

          <Column field="firstName" header="Prénom" />

          <Column field="lastName" header="Nom" />

          <Column field="email" header="Email" />

          <Column header="Rôles">
            <template #body="{ data }">
              {{
                data.roles
                  ?.map(
                    (role: any) =>
                      role.name,
                  )
                  .join(', ')
              }}
            </template>
          </Column>

          <Column header="Statut">
            <template #body="{ data }">
              <Tag :value="data.status" :severity="data.status === 'ACTIVE' ? 'success' : 'secondary'" />
            </template>
          </Column>
          <Column v-if="auth.isAdmin" header="Actions">
            <template #body="{ data }">
              <Button v-if="data.status === 'ACTIVE'" label="Désactiver" severity="danger" size="small"
                :loading="changingStatus.includes(data.id)"
                :disabled="data.id === auth.user?.id || changingStatus.includes(data.id)"
                :title="data.id === auth.user?.id ? 'Vous ne pouvez pas désactiver votre propre compte.' : undefined"
                @click="changeStatus(data.id, 'INACTIVE')" />
              <Button v-else-if="data.status === 'INACTIVE'" label="Réactiver" severity="success" size="small"
                :loading="changingStatus.includes(data.id)"
                :disabled="changingStatus.includes(data.id)"
                @click="changeStatus(data.id, 'ACTIVE')" />
            </template>
          </Column>
        </DataTable>
      </div>

      <Dialog v-model:visible="dialogVisible" modal header="Nouvel utilisateur" class="w-full max-w-xl">
        <form class="space-y-4" @submit.prevent="createUser">
          <Message v-if="error" severity="error">
            {{ error }}
          </Message>

          <div class="grid gap-4 md:grid-cols-2">
            <div>
              <label class="mb-2 block">
                Prénom
              </label>

              <InputText v-model="form.firstName" class="w-full" />
            </div>

            <div>
              <label class="mb-2 block">
                Nom
              </label>

              <InputText v-model="form.lastName" class="w-full" />
            </div>
          </div>

          <div>
            <label class="mb-2 block">
              Email
            </label>

            <InputText v-model="form.email" type="email" class="w-full" />
          </div>

          <div>
            <label class="mb-2 block">
              Mot de passe
            </label>

            <Password v-model="form.password" toggle-mask fluid />
          </div>

          <div>
            <label class="mb-2 block">
              Rôles
            </label>

            <MultiSelect v-model="form.roles" :options="roleOptions" class="w-full"
              placeholder="Choisir un ou plusieurs rôles" />
          </div>

          <div class="flex justify-end gap-3">
            <Button type="button" label="Annuler" severity="secondary" @click="
              dialogVisible = false
              " />

            <Button type="submit" label="Créer" />
          </div>
        </form>
      </Dialog>
    </div>
  </AppLayout>
</template>
