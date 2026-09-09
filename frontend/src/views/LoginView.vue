<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';

import Button from 'primevue/button';
import Card from 'primevue/card';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import Message from 'primevue/message';

import { useAuthStore } from '../stores/auth';

const router = useRouter();
const auth = useAuthStore();

const email = ref('');
const password = ref('');

const loading = ref(false);
const error = ref('');

async function submit() {
  error.value = '';
  loading.value = true;

  try {
    await auth.login(
      email.value,
      password.value,
    );

    await router.push('/');
  } catch (err: any) {
    error.value =
      err.response?.data?.message ??
      'Connexion impossible';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-slate-100 p-6">
    <Card class="w-full max-w-md">
      <template #title>
        Plateforme de veille
      </template>

      <template #subtitle>
        Laboratoire ISO/IEC 17025
      </template>

      <template #content>
        <form class="space-y-5" @submit.prevent="submit">
          <Message v-if="error" severity="error">
            {{ error }}
          </Message>

          <div class="space-y-2">
            <label class="block font-medium">
              Adresse email
            </label>

            <InputText v-model="email" type="email" class="w-full" required />
          </div>

          <div class="space-y-2">
            <label class="block font-medium">
              Mot de passe
            </label>

            <Password v-model="password" :feedback="false" toggle-mask fluid required />
          </div>

          <Button type="submit" label="Se connecter" :loading="loading" class="w-full" />
        </form>
      </template>
    </Card>
  </div>
</template>