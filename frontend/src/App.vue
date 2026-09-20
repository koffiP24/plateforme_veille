<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';
import Toast from 'primevue/toast';
import router from './router';

const navigating = ref(false);

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
  <div v-if="navigating" class="route-progress" role="progressbar" aria-label="Chargement de la page" />
  <Toast position="top-right" :breakpoints="{ '640px': { width: 'calc(100% - 2rem)', right: '1rem' } }">
    <template #message="{ message }">
      <div class="min-w-0 flex-1 py-1">
        <p class="text-base font-semibold">{{ message.summary }}</p>
        <p class="mt-2 whitespace-pre-line text-sm leading-6">{{ message.detail }}</p>
      </div>
    </template>
  </Toast>
  <RouterView v-slot="{ Component, route }">
    <Transition name="page" appear>
      <component :is="Component" :key="route.path" />
    </Transition>
  </RouterView>
</template>
