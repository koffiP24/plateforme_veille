<script setup lang="ts">


import { computed } from 'vue';
import { labelFr } from '../i18n/labels';
import { useRouter } from 'vue-router';

import Button from 'primevue/button';

import { useAuthStore } from '../stores/auth';

const router = useRouter();
const auth = useAuthStore();
const canViewWatchItems = computed(() =>
  ['ADMIN', 'RESPONSABLE_VEILLE', 'OPERATEUR_VEILLE'].some((role) => auth.user?.roles.includes(role)),
);

function logout() {
  auth.logout();
  router.push('/login');
}
</script>

<template>
  <div class="min-h-screen bg-slate-100">
    <aside class="fixed inset-y-0 left-0 w-64 bg-slate-900 p-5 text-white">
      <h1 class="mb-8 text-xl font-bold">
        Veille ISO 17025
      </h1>

      <nav class="space-y-2">
        <RouterLink to="/" class="menu-link" exact-active-class="menu-link-active">
          Tableau de bord
        </RouterLink>

        <RouterLink v-if="canViewWatchItems" to="/watch-items" class="menu-link"
          active-class="menu-link-active">
          Veilles
        </RouterLink>

        <RouterLink v-if="canViewWatchItems" to="/sources" class="menu-link"
          active-class="menu-link-active">
          Sources
        </RouterLink>

        <RouterLink v-if="auth.isAdmin" to="/taxonomy" class="menu-link"
          active-class="menu-link-active">
          Taxonomie
        </RouterLink>

        <RouterLink v-if="auth.isAdmin" to="/users" class="menu-link"
          active-class="menu-link-active">
          Utilisateurs
        </RouterLink>
      </nav>
    </aside>

    <div class="ml-64">
      <header class="flex h-16 items-center justify-between border-b bg-white px-8 text-slate-900">
        <div>
          <p class="font-medium">
            {{ auth.user?.firstName }}
            {{ auth.user?.lastName }}
          </p>

          <p class="mt-0.5 text-sm font-medium text-slate-700">
            {{ auth.user?.roles.map(labelFr).join(', ') +('.')}}
          </p>
        </div>

        <Button label="Déconnexion" severity="secondary" @click="logout" />
      </header>

      <main class="p-8 text-slate-900">
        <slot />
      </main>
    </div>
  </div>
</template>

<style scoped>
.menu-link {
  display: block;
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
  color: #e2e8f0;
  transition: background-color 150ms ease, color 150ms ease;
}

.menu-link:hover {
  background-color: #1e293b;
  color: #ffffff;
}

.menu-link-active,
.menu-link-active:hover {
  background-color: #34d399;
  color: #0f172a;
  font-weight: 700;
}
</style>
