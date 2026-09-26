<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';
import Toast from 'primevue/toast';
import router from './router';

const navigating = ref(false);

function toastIcon(severity?: string) {
  return {
    success: 'pi pi-check-circle',
    error: 'pi pi-times-circle',
    warn: 'pi pi-exclamation-triangle',
    info: 'pi pi-info-circle',
  }[severity ?? 'info'] ?? 'pi pi-info-circle';
}

const removeBeforeGuard = router.beforeEach(() => {
  navigating.value = true;
});

const removeAfterHook = router.afterEach(() => {
  navigating.value = false;
});

const removeErrorHook = router.onError(() => {
  navigating.value = false;
});

onBeforeUnmount(() => {
  removeBeforeGuard();
  removeAfterHook();
  removeErrorHook();
});
</script>

<template>
  <div v-if="navigating" class="route-loading" role="progressbar" aria-label="Chargement de la page">
    <div class="route-progress" />
    <AppSpinner size="small" />
  </div>
  <Toast class="app-toast" position="top-right" :breakpoints="{ '640px': { width: 'calc(100% - 2rem)', right: '1rem' } }">
    <template #message="{ message }">
      <div class="app-toast-content" :class="`toast-${message.severity ?? 'info'}`">
        <span class="app-toast-icon" aria-hidden="true">
          <i :class="toastIcon(message.severity)" />
        </span>
        <div class="app-toast-copy">
          <p class="app-toast-title">{{ message.summary }}</p>
          <p v-if="message.detail" class="app-toast-detail">{{ message.detail }}</p>
        </div>
      </div>
    </template>
  </Toast>
  <RouterView v-slot="{ Component, route }">
    <Transition name="page" appear>
      <component :is="Component" :key="route.path" />
    </Transition>
  </RouterView>
</template>

<style scoped>
.route-loading{position:fixed;inset:.55rem .7rem auto auto;z-index:10000;display:flex;align-items:center;padding:.35rem .5rem;border:1px solid var(--app-border);border-radius:999px;background:var(--app-surface);box-shadow:0 5px 18px rgb(15 23 42 / .14)}.route-loading .route-progress{position:fixed;inset:0 0 auto 0;height:2px;border:0;border-radius:0;background:linear-gradient(90deg,transparent,#10b981,transparent);animation:route-slide 1s ease-in-out infinite}@keyframes route-slide{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}
</style>
