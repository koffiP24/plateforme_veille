<script setup lang="ts">

import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { labelFr } from '../i18n/labels';
import { useRoute, useRouter } from 'vue-router';

import Button from 'primevue/button';

import { getFavorites } from '../services/favorites.service';
import { getNotifications } from '../services/notifications.service';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const menuPinned = ref(false);
const hasFavorites = ref(false);
const unreadNotifications = ref(0);
let notificationRefreshTimer: ReturnType<typeof setInterval> | undefined;
let notificationRefreshing = false;
const canViewWatchItems = computed(() =>
  ['ADMIN', 'RESPONSABLE_VEILLE', 'REFERENT_LABORATOIRE', 'OPERATEUR_VEILLE', 'LECTEUR']
    .some((role) => auth.user?.roles.includes(role)),
);
const canViewSources = computed(() =>
  ['ADMIN', 'RESPONSABLE_VEILLE', 'OPERATEUR_VEILLE']
    .some((role) => auth.user?.roles.includes(role)),
);
const canSeeActions = computed(() => {
  const roles = auth.user?.roles ?? [];
  return roles.includes('ADMIN') || roles.includes('RESPONSABLE_VEILLE') || roles.includes('REFERENT_LABORATOIRE');
});
const canSeeReports = computed(() => {
  const roles = auth.user?.roles ?? [];
  return roles.includes('ADMIN') || roles.includes('RESPONSABLE_VEILLE');
});
const initials = computed(() =>
  `${auth.user?.firstName?.[0] ?? ''}${auth.user?.lastName?.[0] ?? ''}`.toUpperCase() || 'U',
);

async function logout() {
  await auth.logout();
  await router.push('/login');
}

function toggleMenu() {
  menuPinned.value = !menuPinned.value;
}

async function refreshFavoritesVisibility() {
  try {
    const response = await getFavorites();
    hasFavorites.value = Array.isArray(response.data) && response.data.length > 0;
  } catch {
    hasFavorites.value = false;
  }
}

async function refreshNotificationCount() {
  if (
    document.visibilityState !== 'visible' ||
    notificationRefreshing ||
    route.name === 'notifications'
  ) return;
  notificationRefreshing = true;
  try {
    const response = await getNotifications();
    unreadNotifications.value = Array.isArray(response.data)
      ? response.data.filter((notification: { readAt?: string | null }) => !notification.readAt).length
      : 0;
  } catch {
    unreadNotifications.value = 0;
  } finally {
    notificationRefreshing = false;
  }
}

function refreshWhenVisible() {
  if (document.visibilityState === 'visible') {
    void refreshNotificationCount();
  }
}

function updateFavoritesVisibility(event: Event) {
  const count = (event as CustomEvent<number>).detail;
  if (typeof count === 'number') {
    hasFavorites.value = count > 0;
    return;
  }
  void refreshFavoritesVisibility();
}

function updateNotificationCount(event: Event) {
  const count = (event as CustomEvent<number>).detail;
  if (typeof count === 'number') {
    unreadNotifications.value = count;
    return;
  }
  void refreshNotificationCount();
}

onMounted(() => {
  window.addEventListener('favorites-changed', updateFavoritesVisibility);
  window.addEventListener('notifications-changed', updateNotificationCount);
  document.addEventListener('visibilitychange', refreshWhenVisible);
  void refreshFavoritesVisibility();
  void refreshNotificationCount();
  notificationRefreshTimer = setInterval(() => void refreshNotificationCount(), 15000);
});

onBeforeUnmount(() => {
  window.removeEventListener('favorites-changed', updateFavoritesVisibility);
  window.removeEventListener('notifications-changed', updateNotificationCount);
  document.removeEventListener('visibilitychange', refreshWhenVisible);
  if (notificationRefreshTimer) clearInterval(notificationRefreshTimer);
});
</script>

<template>
  <div class="min-h-screen bg-slate-100">
    <aside
      class="sidebar fixed inset-y-0 left-0 z-50 flex w-72 max-w-[calc(100vw-2.5rem)] flex-col bg-slate-900 p-5 text-white"
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

      <h1 class="mb-5 shrink-0 whitespace-nowrap text-xl font-bold">
        Veille ISO/IEC 17025
      </h1>

      <nav class="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1 pb-4" @click="menuPinned = false">
        <section class="menu-group">
          <p class="menu-group-title">Général</p>
          <RouterLink to="/" class="menu-link" exact-active-class="menu-link-active">
            <span class="menu-icon"><i class="pi pi-home" /></span>
            <span>Tableau de bord</span>
          </RouterLink>
        </section>

        <section v-if="canViewWatchItems || canViewSources || auth.isAdmin" class="menu-group">
          <p class="menu-group-title">Veille</p>
          <RouterLink
            v-if="canViewWatchItems"
            to="/watch-items"
            class="menu-link"
            :class="{ 'menu-link-active': route.path === '/watch-items' && route.query.favorites !== '1' }"
          >
            <span class="menu-icon"><i class="pi pi-book" /></span>
            <span>Veilles</span>
          </RouterLink>

          <RouterLink
            v-if="canViewWatchItems && hasFavorites"
            :to="{ path: '/watch-items', query: { favorites: '1' } }"
            class="menu-link"
            :class="{ 'menu-link-active': route.path === '/watch-items' && route.query.favorites === '1' }"
          >
            <span class="menu-icon"><i class="pi pi-star" /></span>
            <span>Mes favoris</span>
          </RouterLink>

          <RouterLink v-if="canViewSources" to="/sources" class="menu-link"
            active-class="menu-link-active">
            <span class="menu-icon"><i class="pi pi-database" /></span>
            <span>Sources</span>
          </RouterLink>

          <RouterLink v-if="auth.isAdmin" to="/taxonomy" class="menu-link"
            active-class="menu-link-active">
            <span class="menu-icon"><i class="pi pi-sitemap" /></span>
            <span>Taxonomie</span>
          </RouterLink>
        </section>

        <section class="menu-group">
          <p class="menu-group-title">Mes alertes</p>
          <RouterLink to="/subscriptions" class="menu-link" active-class="menu-link-active">
            <span class="menu-icon"><i class="pi pi-bell" /></span>
            <span>Mes abonnements</span>
          </RouterLink>

          <RouterLink to="/notifications" class="menu-link" active-class="menu-link-active">
            <span class="menu-icon"><i class="pi pi-inbox" /></span>
            <span>Notifications</span>
            <span v-if="unreadNotifications > 0"
              class="ml-auto min-w-6 rounded-full bg-red-500 px-1.5 py-0.5 text-center text-xs font-bold text-white">
              {{ unreadNotifications > 99 ? '99+' : unreadNotifications }}
            </span>
          </RouterLink>
        </section>

        <section v-if="canSeeActions || canSeeReports" class="menu-group">
          <p class="menu-group-title">Suivi</p>
          <RouterLink v-if="canSeeActions" to="/actions" class="menu-link"
            active-class="menu-link-active">
            <span class="menu-icon"><i class="pi pi-check-square" /></span>
            <span>Actions</span>
          </RouterLink>

          <RouterLink v-if="canSeeReports" to="/reports" class="menu-link"
            active-class="menu-link-active">
            <span class="menu-icon"><i class="pi pi-chart-bar" /></span>
            <span>Rapports</span>
          </RouterLink>
        </section>

        <section v-if="canSeeReports || auth.isAdmin" class="menu-group">
          <p class="menu-group-title">Administration</p>
          <RouterLink v-if="canSeeReports" to="/audit" class="menu-link"
            active-class="menu-link-active">
            <span class="menu-icon"><i class="pi pi-history" /></span>
            <span>Journal d’audit</span>
          </RouterLink>

          <RouterLink v-if="canSeeReports" to="/health" class="menu-link"
            active-class="menu-link-active">
            <span class="menu-icon"><i class="pi pi-server" /></span>
            <span>Santé du système</span>
          </RouterLink>

          <RouterLink v-if="auth.isAdmin" to="/users" class="menu-link"
            active-class="menu-link-active">
            <span class="menu-icon"><i class="pi pi-users" /></span>
            <span>Utilisateurs</span>
          </RouterLink>
        </section>
      </nav>
    </aside>

    <div>
      <header class="flex min-h-16 items-center justify-between bg-white px-6 py-3 text-slate-900 shadow-[0_5px_20px_rgba(15,23,42,0.06)] md:px-8">
        <div class="flex min-w-0 items-center gap-3">
          <div class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800">
            {{ initials }}
          </div>
          <div class="min-w-0">
            <p class="truncate font-semibold">
              {{ auth.user?.firstName }} {{ auth.user?.lastName }}
            </p>
            <p class="mt-0.5 truncate text-xs font-medium text-slate-500">
              {{ auth.user?.roles.map(labelFr).join(', ') }}
            </p>
          </div>
        </div>

        <Button label="Déconnexion" severity="secondary" size="small" class="shrink-0" @click="logout" />
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
  display: flex;
  align-items: center;
  gap: 0.75rem;
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
  min-width: 0;
  color: #e2e8f0;
  transition: background-color 150ms ease, color 150ms ease;
}

.menu-link > span:last-child {
  min-width: 0;
  line-height: 1.25rem;
}

.menu-group {
  display: grid;
  gap: 0.25rem;
}

.menu-group-title {
  margin: 0 0 0.25rem;
  padding: 0 0.75rem;
  color: #64748b;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.menu-icon {
  display: grid;
  width: 2rem;
  height: 2rem;
  flex: 0 0 2rem;
  place-items: center;
  border-radius: 0.55rem;
  background: rgb(255 255 255 / 0.07);
  color: #94a3b8;
  transition: background-color 150ms ease, color 150ms ease;
}

.menu-link:hover .menu-icon {
  background: rgb(52 211 153 / 0.14);
  color: #6ee7b7;
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

.menu-link-active .menu-icon,
.menu-link-active:hover .menu-icon {
  background: rgb(15 23 42 / 0.14);
  color: #0f172a;
}
</style>
