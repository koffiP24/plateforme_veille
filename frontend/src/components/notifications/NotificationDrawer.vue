<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '../../services/notifications.service';

type NotificationItem = {
  id: number;
  title: string;
  message: string;
  createdAt: string;
  readAt: string | null;
  watchItem?: { id: number } | null;
};
type Filter = 'all' | 'unread' | 'actions' | 'watch';

const emit = defineEmits<{ close: []; }>();
const router = useRouter();
const items = ref<NotificationItem[]>([]);
const filter = ref<Filter>('all');
const loading = ref(true);
const busy = ref(false);
const error = ref('');
let refreshTimer: ReturnType<typeof setInterval> | undefined;

const unreadCount = computed(() => items.value.filter(item => !item.readAt).length);
const visibleItems = computed(() => items.value.filter(item => {
  if (filter.value === 'unread') return !item.readAt;
  if (filter.value === 'actions') return /action/i.test(item.title);
  if (filter.value === 'watch') return Boolean(item.watchItem);
  return true;
}));
const groupedItems = computed(() => {
  const groups: { label: string; items: NotificationItem[] }[] = [];
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  for (const item of visibleItems.value) {
    const date = new Date(item.createdAt);
    const label = Number.isNaN(date.getTime()) ? 'Autres' :
      date.toDateString() === today ? 'Aujourd’hui' :
      date.toDateString() === yesterday ? 'Hier' :
      new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
    let group = groups.find(entry => entry.label === label);
    if (!group) {
      group = { label, items: [] };
      groups.push(group);
    }
    group.items.push(item);
  }
  return groups;
});

function announceCount() {
  window.dispatchEvent(new CustomEvent('notifications-changed', { detail: unreadCount.value }));
}
async function load(showLoading = true) {
  if (showLoading) loading.value = true;
  try {
    const response = await getNotifications();
    items.value = Array.isArray(response.data) ? response.data : [];
    error.value = '';
    announceCount();
  } catch {
    error.value = 'Impossible de charger les notifications.';
  } finally {
    loading.value = false;
  }
}
async function read(item: NotificationItem) {
  if (busy.value) return;
  busy.value = true;
  try {
    if (!item.readAt) await markNotificationRead(item.id);
    await load(false);
    if (item.watchItem?.id) {
      emit('close');
      await router.push(`/watch-items/${item.watchItem.id}`);
    }
    error.value = '';
  } catch {
    error.value = 'Impossible d’ouvrir cette notification.';
  } finally {
    busy.value = false;
  }
}
async function readAll() {
  if (busy.value || !unreadCount.value) return;
  busy.value = true;
  try {
    await markAllNotificationsRead();
    await load(false);
  } catch {
    error.value = 'Impossible de marquer les notifications comme lues.';
  } finally {
    busy.value = false;
  }
}
function timeLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(date);
}
function closeOnEscape(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('close');
}
onMounted(() => {
  void load();
  document.addEventListener('keydown', closeOnEscape);
  refreshTimer = setInterval(() => {
    if (document.visibilityState === 'visible' && !busy.value) void load(false);
  }, 15000);
});
onBeforeUnmount(() => {
  document.removeEventListener('keydown', closeOnEscape);
  if (refreshTimer) clearInterval(refreshTimer);
});
</script>

<template>
  <div class="notification-backdrop" @click="emit('close')" />
  <aside class="notification-drawer" role="dialog" aria-modal="true" aria-label="Notifications">
    <div class="drawer-header">
      <div class="drawer-title"><h2>Notifications</h2><span v-if="unreadCount" class="drawer-count">{{ unreadCount }}</span></div>
      <button type="button" class="drawer-close" aria-label="Fermer les notifications" @click="emit('close')"><i class="pi pi-times" /></button>
    </div>
    <div class="drawer-filters" aria-label="Filtrer les notifications">
      <button v-for="tab in ([['all', 'Toutes'], ['unread', 'Non lues'], ['actions', 'Actions'], ['watch', 'Veilles']] as const)"
        :key="tab[0]" type="button" :class="{ active: filter === tab[0] }" :aria-pressed="filter === tab[0]" @click="filter = tab[0]">{{ tab[1] }}</button>
    </div>
    <div class="drawer-content">
      <p v-if="error" class="drawer-error" role="alert">{{ error }}</p>
      <p v-if="loading" class="drawer-empty">Chargement des notifications…</p>
      <p v-else-if="!visibleItems.length" class="drawer-empty">Aucune notification dans cette catégorie.</p>
      <section v-for="group in groupedItems" :key="group.label" class="drawer-group">
        <h3>{{ group.label }}</h3>
        <button v-for="item in group.items" :key="item.id" type="button" class="drawer-item" :class="{ unread: !item.readAt }" :disabled="busy" @click="read(item)">
          <span class="item-icon" :class="item.watchItem ? 'watch-icon' : 'action-icon'"><i :class="item.watchItem ? 'pi pi-file' : 'pi pi-bell'" /></span>
          <span class="item-copy"><span class="item-heading"><strong>{{ item.title }}</strong><time :datetime="item.createdAt">{{ timeLabel(item.createdAt) }}</time></span><span class="item-message">{{ item.message }}</span></span>
          <span v-if="!item.readAt" class="unread-dot" aria-label="Non lue" />
        </button>
      </section>
    </div>
    <div class="drawer-footer"><button type="button" :disabled="busy || !unreadCount" @click="readAll"><i class="pi pi-check" /> Tout marquer comme lu</button></div>
  </aside>
</template>

<style scoped>
.notification-backdrop { position: fixed; inset: 0; z-index: 75; background: rgb(2 6 23 / .48); }
.notification-drawer { position: fixed; inset: 0 0 0 auto; z-index: 76; display: flex; flex-direction: column; width: min(28rem, 100vw); border-left: 1px solid var(--app-border-strong); background: var(--app-surface); color: var(--app-text); box-shadow: -1rem 0 3rem rgb(0 0 0 / .25); }
.drawer-header { display: flex; justify-content: space-between; align-items: center; padding: 1.35rem 1.4rem .8rem; }
.drawer-title { display: flex; align-items: center; gap: .65rem; }
.drawer-title h2 { margin: 0; font-size: 1.2rem; }
.drawer-count { display: grid; place-items: center; min-width: 1.35rem; height: 1.35rem; border-radius: 50%; padding: 0 .3rem; background: #be185d; color: white; font-size: .7rem; font-weight: 800; }
.drawer-close { border: 0; background: transparent; color: var(--app-text-secondary); cursor: pointer; padding: .4rem; }
.drawer-filters { display: flex; flex-wrap: wrap; gap: .4rem; padding: .2rem 1.4rem 1rem; border-bottom: 1px solid var(--app-border); }
.drawer-filters button { border: 1px solid var(--app-border-strong); border-radius: 999px; padding: .42rem .72rem; background: transparent; color: var(--app-text-secondary); font-size: .72rem; cursor: pointer; }
.drawer-filters button.active { border-color: transparent; background: var(--app-primary); color: var(--app-primary-dark); font-weight: 750; }
.drawer-content { min-height: 0; flex: 1; overflow-y: auto; padding: .1rem 1.3rem 1rem; }
.drawer-group h3 { margin: 1rem 0 .55rem; font-size: .8rem; }
.drawer-item { display: flex; width: 100%; align-items: flex-start; gap: .65rem; margin-bottom: .5rem; padding: .85rem .7rem; border: 1px solid var(--app-border-strong); border-radius: .65rem; background: var(--app-surface-2); color: var(--app-text); text-align: left; cursor: pointer; }
.drawer-item:hover { border-color: var(--app-primary); }
.drawer-item.unread { background: var(--app-surface-3); }
.item-icon { display: grid; place-items: center; width: 2.1rem; height: 2.1rem; flex: none; border-radius: 50%; }
.watch-icon { background: rgb(59 130 246 / .18); color: #60a5fa; }
.action-icon { background: rgb(245 158 11 / .16); color: #fbbf24; }
.item-copy { min-width: 0; flex: 1; }
.item-heading { display: flex; justify-content: space-between; gap: .5rem; align-items: baseline; }
.item-heading strong { font-size: .76rem; }
.item-heading time { flex: none; color: var(--app-text-muted); font-size: .65rem; }
.item-message { display: -webkit-box; overflow: hidden; margin-top: .22rem; color: var(--app-text-secondary); font-size: .7rem; line-height: 1.45; overflow-wrap: anywhere; -webkit-box-orient: vertical; -webkit-line-clamp: 3; }
.unread-dot { width: .45rem; height: .45rem; flex: none; margin-top: .3rem; border-radius: 50%; background: #fb7185; }
.drawer-footer { padding: .85rem 1.3rem; border-top: 1px solid var(--app-border); }
.drawer-footer button { width: 100%; border: 0; border-radius: .5rem; padding: .75rem; background: var(--app-primary); color: var(--app-primary-dark); font-size: .78rem; font-weight: 750; cursor: pointer; }
.drawer-footer button:disabled { opacity: .5; cursor: default; }
.drawer-error { color: #fb7185; font-size: .75rem; }
.drawer-empty { padding: 2rem .5rem; color: var(--app-text-muted); text-align: center; font-size: .8rem; }
</style>
