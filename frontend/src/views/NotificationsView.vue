<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import Button from 'primevue/button';
import Card from 'primevue/card';

import AppLayout from '../layouts/AppLayout.vue';
import { getNotifications, markNotificationRead } from '../services/notifications.service';

interface NotificationItem {
  id: number;
  title: string;
  message: string;
  createdAt: string;
  readAt: string | null;
}

type NotificationTab = 'unread' | 'read';

const notifications = ref<NotificationItem[]>([]);
const activeTab = ref<NotificationTab>('unread');
const loading = ref(false);
const reading = ref<number[]>([]);
let refreshTimer: ReturnType<typeof setInterval> | undefined;
const unreadNotifications = computed(() => notifications.value.filter((notification) => !notification.readAt));
const readNotifications = computed(() => notifications.value.filter((notification) => Boolean(notification.readAt)));
const visibleNotifications = computed(() =>
  activeTab.value === 'unread' ? unreadNotifications.value : readNotifications.value,
);
const dateFormatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' });

function formatDate(value: string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : dateFormatter.format(date);
}

function notifyUnreadCount() {
  window.dispatchEvent(new CustomEvent('notifications-changed', {
    detail: unreadNotifications.value.length,
  }));
}

async function load(showLoading = true) {
  if (showLoading) loading.value = true;
  try {
    notifications.value = (await getNotifications()).data;
    notifyUnreadCount();
  } finally {
    if (showLoading) loading.value = false;
  }
}

async function markAsRead(id: number) {
  reading.value = [...reading.value, id];
  try {
    await markNotificationRead(id);
    await load();
  } finally {
    reading.value = reading.value.filter((notificationId) => notificationId !== id);
  }
}

onMounted(() => {
  void load();
  refreshTimer = setInterval(() => void load(false), 5000);
});

onBeforeUnmount(() => {
  if (refreshTimer) clearInterval(refreshTimer);
});
</script>

<template>
  <AppLayout>
    <div class="space-y-4">
      <h2 class="text-2xl font-bold">Notifications</h2>

      <div class="inline-flex rounded-xl bg-white p-1 shadow-sm">
        <Button
          :label="`Non lues (${unreadNotifications.length})`"
          :severity="activeTab === 'unread' ? 'primary' : 'secondary'"
          size="small"
          @click="activeTab = 'unread'"
        />
        <Button
          :label="`Lues (${readNotifications.length})`"
          :severity="activeTab === 'read' ? 'primary' : 'secondary'"
          size="small"
          @click="activeTab = 'read'"
        />
      </div>

      <p v-if="loading" class="rounded-xl bg-white p-5 text-slate-500 shadow-sm">
        Chargement des notifications…
      </p>

      <template v-else>
        <p v-if="!visibleNotifications.length" class="rounded-xl bg-white p-5 text-slate-500 shadow-sm">
          {{ activeTab === 'unread' ? 'Aucune notification non lue.' : 'Aucune notification lue.' }}
        </p>

        <Card
          v-for="notification in visibleNotifications"
          v-else
          :key="notification.id"
          :class="activeTab === 'unread' ? 'border-l-4 border-emerald-400' : 'opacity-80'"
        >
          <template #title>{{ notification.title }}</template>
          <template #subtitle>
            {{ formatDate(notification.createdAt) }}
            <span v-if="notification.readAt"> · Lue le {{ formatDate(notification.readAt) }}</span>
          </template>
          <template #content>
            <p>{{ notification.message }}</p>
            <Button
              v-if="!notification.readAt"
              class="mt-3"
              label="Marquer comme lue"
              size="small"
              :loading="reading.includes(notification.id)"
              @click="markAsRead(notification.id)"
            />
          </template>
        </Card>
      </template>
    </div>
  </AppLayout>
</template>
