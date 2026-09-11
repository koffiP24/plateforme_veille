<script setup lang="ts">
import Toast from 'primevue/toast';
</script>

<template>
  <Toast position="top-right" :breakpoints="{ '640px': { width: 'calc(100% - 2rem)', right: '1rem' } }">
    <template #message="{ message }">
      <div class="min-w-0 flex-1 py-1">
        <p class="text-base font-semibold">{{ message.summary }}</p>
        <p class="mt-2 whitespace-pre-line text-sm leading-6">{{ message.detail }}</p>
      </div>
    </template>
  </Toast>
  <RouterView />
</template>
