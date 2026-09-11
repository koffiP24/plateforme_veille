<script setup lang="ts">
import { computed } from 'vue';
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
        <RouterLink to="/" class="block rounded-lg px-4 py-3 hover:bg-slate-800">
          Tableau de bord
        </RouterLink>

        <RouterLink to="/sources" class="block rounded-lg px-4 py-3 hover:bg-slate-800">
          Sources
        </RouterLink>

        <RouterLink v-if="canViewWatchItems" to="/watch-items" class="block rounded-lg px-4 py-3 hover:bg-slate-800">
          Veilles
        </RouterLink>

        <RouterLink v-if="auth.isAdmin" to="/users" class="block rounded-lg px-4 py-3 hover:bg-slate-800">
          Utilisateurs
        </RouterLink>
      </nav>
    </aside>

    <div class="ml-64">
      <header class="flex h-16 items-center justify-between border-b bg-white px-8">
        <div>
          <p class="font-medium">
            {{ auth.user?.firstName }}
            {{ auth.user?.lastName }}
          </p>

          <p class="text-sm text-slate-500">
            {{ auth.user?.roles.join(', ') }}
          </p>
        </div>

        <Button label="Déconnexion" severity="secondary" @click="logout" />
      </header>

      <main class="p-8">
        <slot />
      </main>
    </div>
  </div>
</template>
