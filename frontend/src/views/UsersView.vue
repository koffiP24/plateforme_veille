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

import AppLayout from '../layouts/AppLayout.vue';
import api from '../services/api';

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

          <Column field="status" header="Statut" />
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