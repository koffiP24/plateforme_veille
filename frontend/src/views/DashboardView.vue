<script setup lang="ts">
import Message from 'primevue/message';
import Card from 'primevue/card';

import AppLayout from '../layouts/AppLayout.vue';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
</script>

<template>
  <AppLayout>
    <div class="space-y-6">
      <div>
        <h2 class="text-2xl font-bold text-slate-900">
          Tableau de bord
        </h2>

        <p class="text-slate-500">
          Bienvenue
          {{ auth.user?.firstName }}.
        </p>
      </div>

      <div class="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <template #title>
            Semaine 3
          </template>

          <template #content>
            Socle de l'application
          </template>
        </Card>

        <Card>
          <template #title>
            Authentification
          </template>

          <template #content>
            Fonctionnelle
          </template>
        </Card>

        <Card>
          <template #title>
            Rôles
          </template>

          <template #content>
            {{ auth.user?.roles.join(', ') }}
          </template>
        </Card>

        <Card>
          <template #title>
            Base
          </template>

          <template #content>
            PostgreSQL
          </template>
        </Card>
      </div>

      <Message severity="info" :closable="false">
        Les véritables KPI de veille seront
        ajoutés lors des prochaines semaines.
      </Message>
    </div>
  </AppLayout>
</template>