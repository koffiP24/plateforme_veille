<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';

import Button from 'primevue/button';
import Card from 'primevue/card';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import Message from 'primevue/message';

import { useAuthStore } from '../stores/auth';
import logoVeille from '../assets/logos/logo-veille-microscope.png';

const router = useRouter();
const auth = useAuthStore();

const email = ref('');
const password = ref('');

const loading = ref(false);
const error = ref('');

async function completeLoadingAnimation(startedAt: number) {
  const remaining = 900 - (performance.now() - startedAt);
  if (remaining > 0) {
    await new Promise((resolve) => window.setTimeout(resolve, remaining));
  }
}

async function submit() {
  if (loading.value) return;

  const animationStartedAt = performance.now();
  error.value = '';
  loading.value = true;

  try {
    await auth.login(
      email.value,
      password.value,
    );

    await completeLoadingAnimation(animationStartedAt);
    await router.push('/');
  } catch (err: any) {
    await completeLoadingAnimation(animationStartedAt);
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
    <Transition name="loading-screen">
      <div
        v-if="loading"
        class="login-loading"
        role="status"
        aria-live="polite"
        aria-label="Connexion en cours"
      >
        <div class="login-loading-logo">
          <span class="login-loading-ring login-loading-ring-one" />
          <span class="login-loading-ring login-loading-ring-two" />
          <img :src="logoVeille" alt="" class="login-loading-image" />
        </div>

        <p class="text-xl font-semibold text-white">Connexion en cours</p>
        <p class="mt-2 text-sm text-slate-300">Préparation de votre espace de veille…</p>

        <div class="login-loading-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>
    </Transition>

    <Card class="w-full max-w-md">
      <template #title>
        <div class="flex items-center gap-3">
          <img :src="logoVeille" alt="Logo de la plateforme de veille" class="h-14 w-14 object-contain" />
          <span>Plateforme de veille</span>
        </div>
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
              Adresse électronique
            </label>

            <InputText v-model="email" type="email" class="w-full" required />
          </div>

          <div class="space-y-2">
            <label class="block font-medium">
              Mot de passe
            </label>

            <Password v-model="password" :feedback="false" toggle-mask fluid required />
          </div>

          <Button type="submit" label="Se connecter" :loading="loading" :disabled="loading" class="w-full" />
        </form>
      </template>
    </Card>
  </div>
</template>

<style scoped>
.login-loading {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgb(15 23 42 / 96%);
  backdrop-filter: blur(6px);
}

.login-loading-logo {
  position: relative;
  display: grid;
  width: 10rem;
  height: 10rem;
  margin-bottom: 1.5rem;
  place-items: center;
}

.login-loading-image {
  position: relative;
  z-index: 2;
  width: 7rem;
  height: 7rem;
  object-fit: contain;
  animation: logo-breathe 1.4s ease-in-out infinite;
}

.login-loading-ring {
  position: absolute;
  border: 2px solid rgb(52 211 153 / 65%);
  border-radius: 9999px;
  opacity: 0;
  animation: radar-wave 1.8s ease-out infinite;
}

.login-loading-ring-one {
  inset: 1.25rem;
}

.login-loading-ring-two {
  inset: 0;
  animation-delay: 0.6s;
}

.login-loading-dots {
  display: flex;
  gap: 0.45rem;
  margin-top: 1.25rem;
}

.login-loading-dots span {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 9999px;
  background: #34d399;
  animation: dot-bounce 1.2s ease-in-out infinite;
}

.login-loading-dots span:nth-child(2) {
  animation-delay: 0.15s;
}

.login-loading-dots span:nth-child(3) {
  animation-delay: 0.3s;
}

.loading-screen-enter-active,
.loading-screen-leave-active {
  transition: opacity 180ms ease;
}

.loading-screen-enter-from,
.loading-screen-leave-to {
  opacity: 0;
}

@keyframes radar-wave {
  0% { opacity: 0.8; transform: scale(0.65); }
  100% { opacity: 0; transform: scale(1.15); }
}

@keyframes logo-breathe {
  0%, 100% { transform: scale(0.96); }
  50% { transform: scale(1.04); }
}

@keyframes dot-bounce {
  0%, 60%, 100% { opacity: 0.35; transform: translateY(0); }
  30% { opacity: 1; transform: translateY(-0.4rem); }
}

@media (prefers-reduced-motion: reduce) {
  .login-loading-image,
  .login-loading-ring,
  .login-loading-dots span {
    animation: none;
  }
}
</style>
