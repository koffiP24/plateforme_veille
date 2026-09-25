<script setup lang="ts">
import {
  computed,
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
import { useToast } from 'primevue/usetoast';

import { isAxiosError } from 'axios';

import AppLayout
  from '../layouts/AppLayout.vue';

import api
  from '../services/api';

import {
  labelFr,
} from '../i18n/labels';

import {
  useAuthStore,
} from '../stores/auth';


/* =====================================================
 * TYPES
 * ===================================================== */

interface UserRole {
  id: number;

  name: string;

  description:
  string | null;
}


interface UserRow {
  id: number;

  firstName: string;

  lastName: string;

  email: string;

  status:
  'ACTIVE'
  | 'INACTIVE';

  roles:
  UserRole[];
}


/* =====================================================
 * STORES / SERVICES
 * ===================================================== */

const auth =
  useAuthStore();

const toast =
  useToast();


/* =====================================================
 * DONNÉES UTILISATEURS
 * ===================================================== */

const users =
  ref<UserRow[]>([]);

const availableRoles =
  ref<UserRole[]>([]);

const loading =
  ref(false);

const statusError =
  ref('');

const changingStatus =
  ref<number[]>([]);


/* =====================================================
 * CRÉATION UTILISATEUR
 * ===================================================== */

const dialogVisible =
  ref(false);

const creating =
  ref(false);

const error =
  ref('');

const form = ref({
  firstName: '',

  lastName: '',

  email: '',

  password: '',

  roles: [] as string[],
});


/* =====================================================
 * MODIFICATION DES RÔLES
 * ===================================================== */

const roleDialogVisible =
  ref(false);

const selectedUser =
  ref<UserRow | null>(
    null,
  );

const selectedRoleNames =
  ref<string[]>([]);

const roleError =
  ref('');

const savingRoles =
  ref(false);


/* =====================================================
 * OPTIONS DE RÔLES
 * ===================================================== */

const roleOptions =
  computed(() =>
    availableRoles.value.map(
      (role) => ({
        label:
          labelFr(
            role.name,
          ),

        value:
          role.name,
      }),
    ),
  );


/* =====================================================
 * AFFICHAGE DES RÔLES
 *
 * Exemple :
 * Lecteur, Responsable de veille
 *
 * Si l'utilisateur possède tous les rôles :
 * Tous les rôles
 * ===================================================== */

function formatUserRoles(
  roles: UserRole[],
): string {
  if (!roles.length) {
    return 'Aucun rôle';
  }

  /*
   * Liste de tous les rôles
   * disponibles dans l'application.
   */
  const availableRoleNames =
    new Set(
      availableRoles.value.map(
        (role) =>
          role.name,
      ),
    );

  /*
   * Liste des rôles de
   * l'utilisateur courant.
   */
  const userRoleNames =
    new Set(
      roles.map(
        (role) =>
          role.name,
      ),
    );

  /*
   * L'utilisateur possède
   * tous les rôles disponibles.
   */
  const hasAllRoles =
    availableRoleNames.size > 0
    &&
    availableRoleNames.size ===
    userRoleNames.size
    &&
    [
      ...availableRoleNames,
    ].every(
      (roleName) =>
        userRoleNames.has(
          roleName,
        ),
    );

  if (hasAllRoles) {
    return 'Tous les rôles';
  }

  /*
   * Sinon :
   * Lecteur, Administrateur,
   * Responsable de veille...
   */
  return roles
    .map(
      (role) =>
        labelFr(
          role.name,
        ),
    )
    .join(', ');
}


/* =====================================================
 * GESTION DES ERREURS API
 * ===================================================== */

function apiError(
  err: unknown,

  fallback: string,
) {
  const message =
    isAxiosError(err)
      ? err.response
        ?.data
        ?.message
      : undefined;

  return typeof message ===
    'string'
    ? message
    : fallback;
}


/* =====================================================
 * CHARGER LES UTILISATEURS
 * ===================================================== */

async function loadUsers() {
  loading.value =
    true;

  statusError.value =
    '';

  try {
    const [
      usersResponse,
      rolesResponse,
    ] =
      await Promise.all([
        api.get<UserRow[]>(
          '/users',
        ),

        api.get<UserRole[]>(
          '/roles',
        ),
      ]);

    users.value =
      usersResponse.data;

    availableRoles.value =
      rolesResponse.data;
  } catch (
  err: unknown
  ) {
    statusError.value =
      apiError(
        err,
        'Impossible de charger les utilisateurs et les rôles.',
      );
  } finally {
    loading.value =
      false;
  }
}


/* =====================================================
 * CRÉER UN UTILISATEUR
 * ===================================================== */

async function createUser() {
  if (
    creating.value
  ) {
    return;
  }

  error.value =
    '';

  creating.value =
    true;

  try {
    await api.post(
      '/users',
      form.value,
    );

    dialogVisible.value =
      false;

    form.value = {
      firstName: '',

      lastName: '',

      email: '',

      password: '',

      roles: [],
    };

    await loadUsers();

    toast.add({
      severity:
        'success',

      summary:
        'Utilisateur créé',

      detail:
        'Le compte a été créé avec succès.',

      life:
        5000,
    });
  } catch (
  err: unknown
  ) {
    error.value =
      apiError(
        err,
        'Création impossible.',
      );
  } finally {
    creating.value =
      false;
  }
}


/* =====================================================
 * OUVRIR MODIFICATION DES RÔLES
 * ===================================================== */

function editRoles(
  user: UserRow,
) {
  selectedUser.value =
    user;

  selectedRoleNames.value =
    user.roles.map(
      (role) =>
        role.name,
    );

  roleError.value =
    '';

  roleDialogVisible.value =
    true;
}


/* =====================================================
 * ENREGISTRER LES RÔLES
 * ===================================================== */

async function saveRoles() {
  const user =
    selectedUser.value;

  if (
    !user ||
    savingRoles.value
  ) {
    return;
  }

  roleError.value =
    '';

  /*
   * Un utilisateur doit
   * posséder au moins un rôle.
   */
  if (
    !selectedRoleNames
      .value
      .length
  ) {
    roleError.value =
      'Sélectionne au moins un rôle.';

    return;
  }

  /*
   * L'administrateur actuellement
   * connecté ne peut pas retirer
   * son propre rôle ADMIN.
   */
  if (
    user.id ===
    auth.user?.id
    &&
    !selectedRoleNames
      .value
      .includes(
        'ADMIN',
      )
  ) {
    roleError.value =
      'Vous devez conserver votre propre rôle Administrateur.';

    return;
  }

  savingRoles.value =
    true;

  try {
    const response =
      await api.patch<{
        id: number;

        roles:
        UserRole[];
      }>(
        `/users/${user.id}/roles`,

        {
          roles:
            selectedRoleNames.value,
        },
      );

    /*
     * Mise à jour directe
     * de la ligne du tableau.
     */
    user.roles =
      response.data.roles;

    /*
     * Si l'admin modifie
     * ses propres rôles,
     * actualiser le store.
     */
    if (
      user.id ===
      auth.user?.id
    ) {
      auth.user.roles =
        response.data.roles.map(
          (role) =>
            role.name,
        );

      localStorage.setItem(
        'current_user',

        JSON.stringify(
          auth.user,
        ),
      );
    }

    roleDialogVisible.value =
      false;

    toast.add({
      severity:
        'success',

      summary:
        'Rôles modifiés',

      detail:
        `Les rôles de ${user.firstName} ${user.lastName} ont été enregistrés.`,

      life:
        5000,
    });
  } catch (
  err: unknown
  ) {
    roleError.value =
      apiError(
        err,
        'Impossible de modifier les rôles de cet utilisateur.',
      );
  } finally {
    savingRoles.value =
      false;
  }
}


/* =====================================================
 * ACTIVER / DÉSACTIVER UTILISATEUR
 * ===================================================== */

async function changeStatus(
  id: number,

  status:
    'ACTIVE'
    | 'INACTIVE',
) {
  if (
    !auth.isAdmin ||
    changingStatus
      .value
      .includes(id)
  ) {
    return;
  }

  statusError.value =
    '';

  changingStatus
    .value
    .push(id);

  try {
    const response =
      await api.patch<{
        id: number;

        status:
        UserRow['status'];
      }>(
        `/users/${id}/status`,

        {
          status,
        },
      );

    const user =
      users.value.find(
        (item) =>
          item.id === id,
      );

    if (user) {
      user.status =
        response.data.status;
    }
  } catch (
  err: unknown
  ) {
    statusError.value =
      apiError(
        err,
        'Impossible de modifier le statut du compte.',
      );
  } finally {
    changingStatus.value =
      changingStatus
        .value
        .filter(
          (item) =>
            item !== id,
        );
  }
}


/* =====================================================
 * INITIALISATION
 * ===================================================== */

onMounted(
  loadUsers,
);
</script>


<template>
  <AppLayout>
    <div class="space-y-6">

      <!-- =================================================
           EN-TÊTE
           ================================================= -->

      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 class="text-2xl font-bold text-slate-900">
            Utilisateurs
          </h2>

          <p class="text-slate-700">
            Gestion des comptes et rôles.
          </p>
        </div>

        <Button label="Ajouter un utilisateur" icon="pi pi-plus" @click="
          dialogVisible = true
          " />
      </div>


      <!-- =================================================
           ERREUR GÉNÉRALE
           ================================================= -->

      <Message v-if="statusError" severity="error">
        {{ statusError }}
      </Message>


      <!-- =================================================
           TABLEAU UTILISATEURS
           ================================================= -->

      <div class="rounded-xl bg-white p-5 shadow-sm">
        <DataTable :value="users" :loading="loading" data-key="id" paginator :rows="10">

          <!-- IDENTIFIANT -->

          <Column field="id" header="Identifiant" />


          <!-- PRÉNOM -->

          <Column field="firstName" header="Prénom" />


          <!-- NOM -->

          <Column field="lastName" header="Nom" />


          <!-- EMAIL -->

          <Column field="email" header="Adresse électronique" />


          <!-- =================================================
               RÔLES

               Plus de Tags individuels.
               Affichage compact en texte.

               Exemple :
               Lecteur, Responsable de veille

               Tous les rôles si l'utilisateur
               possède tous les rôles disponibles.
               ================================================= -->

          <Column header="Rôles">
            <template #body="{ data }">
              <span class="text-sm font-medium text-slate-700">
                {{
                  formatUserRoles(
                    data.roles,
                  )
                }}
              </span>
            </template>
          </Column>


          <!-- =================================================
               STATUT

               Ici on conserve Tag car
               Actif / Inactif est bien
               adapté à un badge.
               ================================================= -->

          <Column header="Statut">
            <template #body="{ data }">
              <Tag :value="labelFr(
                data.status,
              )
                " :severity="data.status ===
                    'ACTIVE'
                    ? 'success'
                    : 'secondary'
                  " />
            </template>
          </Column>


          <!-- =================================================
               ACTIONS
               ================================================= -->

          <Column v-if="auth.isAdmin" header="Actions">
            <template #body="{ data }">

              <!--
                flex-nowrap :
                empêche les boutons
                de passer l'un sous l'autre.
              -->

              <div class="flex flex-nowrap items-center gap-2">

                <!-- MODIFIER RÔLES -->

                <Button label="Modifier les rôles" icon="pi pi-user-edit" severity="secondary" size="small" @click="
                  editRoles(data)
                  " />


                <!-- DÉSACTIVER -->

                <Button v-if="
                  data.status ===
                  'ACTIVE'
                " label="Désactiver" severity="danger" size="small" :loading="changingStatus.includes(
                    data.id,
                  )
                    " :disabled="data.id ===
                    auth.user?.id
                    ||
                    changingStatus.includes(
                      data.id,
                    )
                    " :title="data.id ===
                      auth.user?.id
                      ? 'Vous ne pouvez pas désactiver votre propre compte.'
                      : undefined
                    " @click="
                    changeStatus(
                      data.id,
                      'INACTIVE',
                    )
                    " />


                <!-- RÉACTIVER -->

                <Button v-else label="Réactiver" severity="success" size="small" :loading="changingStatus.includes(
                  data.id,
                )
                  " :disabled="changingStatus.includes(
                    data.id,
                  )
                    " @click="
                    changeStatus(
                      data.id,
                      'ACTIVE',
                    )
                    " />

              </div>
            </template>
          </Column>

        </DataTable>
      </div>


      <!-- =================================================
           DIALOG : MODIFIER LES RÔLES
           ================================================= -->

      <Dialog v-model:visible="roleDialogVisible
        " modal header="Modifier les rôles" class="w-full max-w-xl" :closable="!savingRoles
          " :close-on-escape="!savingRoles
          ">
        <form class="space-y-5" @submit.prevent="
          saveRoles
        ">

          <!-- UTILISATEUR -->

          <p v-if="selectedUser" class="text-slate-200">
            {{
              selectedUser.firstName
            }}

            {{
              selectedUser.lastName
            }}

            —

            {{
              selectedUser.email
            }}
          </p>


          <!-- ERREUR -->

          <Message v-if="roleError" severity="error">
            {{ roleError }}
          </Message>


          <!-- RÔLES -->

          <div>
            <label for="user-roles" class="mb-2 block font-medium">
              Rôles attribués
            </label>

            <MultiSelect id="user-roles" v-model="selectedRoleNames
              " :options="roleOptions
                " option-label="label" option-value="value" display="chip" filter class="w-full"
              placeholder="Choisir un ou plusieurs rôles" :disabled="savingRoles
                " />
          </div>


          <!-- INFORMATION ADMIN -->

          <Message v-if="
            selectedUser?.id ===
            auth.user?.id
          " severity="info" :closable="false">
            Vous pouvez ajouter des rôles
            à votre compte, mais vous devez
            conserver le rôle Administrateur.
          </Message>


          <!-- BOUTONS -->

          <div class="flex justify-end gap-3">
            <Button type="button" label="Annuler" severity="secondary" :disabled="savingRoles
              " @click="
                roleDialogVisible =
                false
                " />

            <Button type="submit" label="Enregistrer les rôles" :loading="savingRoles
              " :disabled="savingRoles
                " />
          </div>

        </form>
      </Dialog>


      <!-- =================================================
           DIALOG : NOUVEL UTILISATEUR
           ================================================= -->

      <Dialog v-model:visible="dialogVisible
        " modal header="Nouvel utilisateur" class="w-full max-w-xl" :closable="!creating
          " :close-on-escape="!creating
          ">
        <form class="space-y-4" @submit.prevent="
          createUser
        ">

          <!-- ERREUR -->

          <Message v-if="error" severity="error">
            {{ error }}
          </Message>


          <!-- PRÉNOM / NOM -->

          <div class="grid gap-4 md:grid-cols-2">
            <div>
              <label class="mb-2 block">
                Prénom
              </label>

              <InputText v-model="form.firstName
                " class="w-full" required />
            </div>


            <div>
              <label class="mb-2 block">
                Nom
              </label>

              <InputText v-model="form.lastName
                " class="w-full" required />
            </div>
          </div>


          <!-- EMAIL -->

          <div>
            <label class="mb-2 block">
              Adresse électronique
            </label>

            <InputText v-model="form.email
              " type="email" class="w-full" required />
          </div>


          <!-- MOT DE PASSE -->

          <div>
            <label class="mb-2 block">
              Mot de passe
            </label>

            <Password v-model="form.password
              " toggle-mask fluid required />
          </div>


          <!-- RÔLES -->

          <div>
            <label class="mb-2 block">
              Rôles
            </label>

            <MultiSelect v-model="form.roles
              " :options="roleOptions
                " option-label="label" option-value="value" class="w-full" placeholder="Choisir un ou plusieurs rôles"
              required />
          </div>


          <!-- BOUTONS -->

          <div class="flex justify-end gap-3">
            <Button type="button" label="Annuler" severity="secondary" :disabled="creating
              " @click="
                dialogVisible =
                false
                " />

            <Button type="submit" label="Créer" :loading="creating
              " :disabled="creating
                " />
          </div>

        </form>
      </Dialog>

    </div>
  </AppLayout>
</template>