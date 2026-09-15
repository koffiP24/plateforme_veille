<script setup lang="ts">

import { computed, ref } from 'vue';
import { labelFr } from '../i18n/labels';
import { useRouter } from 'vue-router';

import Button from 'primevue/button';

import { useAuthStore } from '../stores/auth';

const router = useRouter();
const auth = useAuthStore();
const menuPinned = ref(false);
const canViewWatchItems = computed(() =>
  ['ADMIN', 'RESPONSABLE_VEILLE', 'OPERATEUR_VEILLE'].some((role) => auth.user?.roles.includes(role)),
);

function logout() {
  auth.logout();
  router.push('/login');
}

function toggleMenu() {
  menuPinned.value = !menuPinned.value;
}
</script>

<template>
  <div class="min-h-screen bg-slate-100">
    <aside
      class="sidebar fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 p-5 text-white"
      :class="{ 'sidebar-pinned': menuPinned }"
    >
      <button
        type="button"
        class="sidebar-handle"
        :aria-label="menuPinned ? 'Masquer le menu' : 'Afficher le menu'"
        :aria-pressed="menuPinned"
        :title="menuPinned ? 'Masquer le menu' : 'Afficher le menu'"
        @click="toggleMenu"
      >
        <span aria-hidden="true">☰</span>
      </button>

      <h1 class="mb-8 text-xl font-bold">
        Veille ISO 17025
      </h1>

      <nav class="space-y-2" @click="menuPinned = false">
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

    <div>
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
.sidebar {
  transform: translateX(-100%);
  box-shadow: 0 20px 35px rgb(15 23 42 / 0.3);
  transition: transform 220ms ease;
}

.sidebar:hover,
.sidebar-pinned {
  transform: translateX(0);
}

.sidebar-handle {
  position: absolute;
  top: 50%;
  right: -2.5rem;
  display: grid;
  width: 2.5rem;
  height: 4rem;
  place-items: center;
  transform: translateY(-50%);
  border: 0;
  border-radius: 0 0.6rem 0.6rem 0;
  background: #0f172a;
  color: #ffffff;
  font-size: 1.25rem;
  cursor: pointer;
  box-shadow: 6px 4px 14px rgb(15 23 42 / 0.22);
}

.sidebar-handle:hover,
.sidebar-handle:focus-visible {
  background: #1e293b;
  outline: 2px solid #34d399;
  outline-offset: -2px;
}

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
