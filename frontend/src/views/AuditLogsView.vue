<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Dialog from 'primevue/dialog';
import Message from 'primevue/message';
import AppLayout from '../layouts/AppLayout.vue';
import { getAuditLogs } from '../services/audit.service';
import { getUsers } from '../services/users.service';
import { getWatchItems } from '../services/watch-items.service';

interface AuditLog {
  id: number;
  action: string;
  entity: string;
  entityId: number | null;
  entityDisplay?: string | null;
  beforeValue: unknown;
  afterValue: unknown;
  ipAddress: string | null;
  createdAt: string;
  user: { firstName: string; lastName: string; email: string } | null;
}

const logs = ref<AuditLog[]>([]);
const loading = ref(false);
const error = ref('');
const detailsVisible = ref(false);
const selectedLog = ref<AuditLog | null>(null);
const userLabels = ref(new Map<number, string>());
const watchItemLabels = ref(new Map<number, string>());

interface DetailRow {
  key: string;
  label: string;
  before: string;
  after: string;
}

type AuditGroup = 'all' | 'users' | 'watch' | 'sources' | 'taxonomy' | 'actions' | 'alerts' | 'reports' | 'access';

const activeGroup = ref<AuditGroup>('all');
const auditGroups: Array<{ key: AuditGroup; label: string; entities: string[] }> = [
  { key: 'all', label: 'Tout', entities: [] },
  { key: 'users', label: 'Utilisateurs', entities: ['users'] },
  { key: 'watch', label: 'Veilles', entities: ['watch_items', 'saved_views'] },
  { key: 'sources', label: 'Sources', entities: ['sources', 'connectors', 'collection_runs'] },
  { key: 'taxonomy', label: 'Taxonomie', entities: ['topics', 'domains', 'laboratories', 'keywords', 'keyword_synonyms'] },
  { key: 'actions', label: 'Actions', entities: ['follow_up_actions'] },
  { key: 'alerts', label: 'Alertes', entities: ['subscriptions', 'notifications'] },
  { key: 'reports', label: 'Rapports', entities: ['reports'] },
  { key: 'access', label: 'Connexions', entities: ['auth'] },
];

const filteredLogs = computed(() => {
  const group = auditGroups.find((item) => item.key === activeGroup.value);
  if (!group || group.key === 'all') return logs.value;
  return logs.value.filter((log) => group.entities.includes(log.entity));
});

const actionLabels: Record<string, string> = {
  LOGIN: 'Connexion', LOGOUT: 'Déconnexion',
  CREATE_USER: 'Création d’un utilisateur', ACTIVATE_USER: 'Activation d’un utilisateur',
  DEACTIVATE_USER: 'Désactivation d’un utilisateur', UPDATE_USER_ROLES: 'Modification des rôles',
  CREATE_SOURCE: 'Création d’une source', UPDATE_SOURCE: 'Modification d’une source',
  ACTIVATE_SOURCE: 'Activation d’une source', DEACTIVATE_SOURCE: 'Désactivation d’une source',
  CREATE_CONNECTOR: 'Création d’un connecteur', TEST_CONNECTOR: 'Test d’un connecteur',
  RUN_COLLECTION: 'Lancement d’une collecte', RETRY_COLLECTION: 'Relance d’une collecte',
  IMPORT_MANUAL_ITEMS: 'Import manuel d’éléments de veille',
  QUALIFY_WATCH_ITEM: 'Qualification d’une veille', VALIDATE_WATCH_ITEM: 'Validation d’une veille',
  REJECT_WATCH_ITEM: 'Rejet d’une veille', PUBLISH_WATCH_ITEM: 'Publication d’une veille',
  ARCHIVE_WATCH_ITEM: 'Archivage d’une veille',
  CREATE_FOLLOW_UP_ACTION: 'Création d’une action de suivi',
  UPDATE_FOLLOW_UP_ACTION: 'Modification d’une action de suivi',
  DELETE_FOLLOW_UP_ACTION: 'Suppression d’une action de suivi',
  CREATE_TOPIC: 'Création d’un thème', UPDATE_TOPIC: 'Modification d’un thème', DELETE_TOPIC: 'Suppression d’un thème',
  CREATE_DOMAIN: 'Création d’un domaine', UPDATE_DOMAIN: 'Modification d’un domaine', DELETE_DOMAIN: 'Suppression d’un domaine',
  CREATE_LABORATORY: 'Création d’un laboratoire', UPDATE_LABORATORY: 'Modification d’un laboratoire', DELETE_LABORATORY: 'Suppression d’un laboratoire',
  CREATE_KEYWORD: 'Création d’un mot-clé', UPDATE_KEYWORD: 'Modification d’un mot-clé', DELETE_KEYWORD: 'Suppression d’un mot-clé',
  CREATE_KEYWORD_SYNONYM: 'Création d’un synonyme', UPDATE_KEYWORD_SYNONYM: 'Modification d’un synonyme', DELETE_KEYWORD_SYNONYM: 'Suppression d’un synonyme',
  ADD_FAVORITE: 'Ajout d’une veille aux favoris', REMOVE_FAVORITE: 'Retrait d’une veille des favoris',
  CREATE_SAVED_VIEW: 'Création d’une vue enregistrée', DELETE_SAVED_VIEW: 'Suppression d’une vue enregistrée',
  CREATE_SUBSCRIPTION: 'Création d’un abonnement', DELETE_SUBSCRIPTION: 'Suppression d’un abonnement',
  READ_NOTIFICATION: 'Lecture d’une notification', GENERATE_REPORT: 'Génération d’un rapport',
  DOWNLOAD_REPORT: 'Téléchargement d’un rapport',
};

const entityLabels: Record<string, string> = {
  auth: 'Authentification', users: 'Utilisateurs', sources: 'Sources', connectors: 'Connecteurs',
  collection_runs: 'Collectes', watch_items: 'Veilles', follow_up_actions: 'Actions de suivi',
  topics: 'Thèmes', domains: 'Domaines', laboratories: 'Laboratoires', keywords: 'Mots-clés',
  keyword_synonyms: 'Synonymes', saved_views: 'Vues enregistrées', subscriptions: 'Abonnements',
  notifications: 'Notifications', reports: 'Rapports',
};

const fieldLabels: Record<string, string> = {
  id: 'Identifiant', firstName: 'Prénom', lastName: 'Nom', email: 'Adresse électronique',
  status: 'Statut', roles: 'Rôles', name: 'Nom', label: 'Libellé', description: 'Description',
  active: 'Actif', organization: 'Organisme', country: 'Pays', category: 'Catégorie',
  sourceType: 'Type de source', baseUrl: 'Adresse de la source', frequency: 'Fréquence',
  connectorId: 'Connecteur', runId: 'Collecte', source: 'Source', received: 'Éléments reçus',
  created: 'Nouveaux éléments', updated: 'Éléments mis à jour', duplicates: 'Doublons',
  errors: 'Erreurs', error: 'Message d’erreur', watchType: 'Type de veille',
  relevance: 'Pertinence', criticality: 'Criticité', domainIds: 'Domaines',
  laboratoryIds: 'Laboratoires', topicIds: 'Thèmes', keywordIds: 'Mots-clés',
  title: 'Titre', actionType: 'Type d’action', owner: 'Responsable', ownerId: 'Responsable', dueDate: 'Échéance',
  impact: 'Impact', comment: 'Commentaire', decision: 'Décision', weight: 'Poids',
  parentId: 'Thème parent', keywordId: 'Mot-clé', periodicity: 'Périodicité',
  format: 'Format', downloaded: 'Téléchargement effectué', message: 'Message',
  createdAt: 'Date de création', updatedAt: 'Date de modification', publishedAt: 'Date de publication',
  user: 'Utilisateur', userId: 'Utilisateur', success: 'Opération réussie', count: 'Nombre d’éléments',
  connectorType: 'Type de connecteur', config: 'Configuration', lastTestAt: 'Dernier test',
  watchItem: 'Veille', watchItemId: 'Veille', filters: 'Filtres', targetType: 'Type d’abonnement',
  sourceId: 'Source', topicId: 'Thème', criticalityMin: 'Criticité minimale',
  notificationChannel: 'Canal de notification', dateFrom: 'Date de début', dateTo: 'Date de fin',
  filePath: 'Fichier', items: 'Éléments', readAt: 'Date de lecture',
};

const valueLabels: Record<string, string> = {
  ACTIVE: 'Actif', INACTIVE: 'Inactif', OPEN: 'Ouverte', IN_PROGRESS: 'En cours',
  DONE: 'Terminée', COMPLETED: 'Terminée', COMPLETED_WITH_ERRORS: 'Terminée avec des erreurs',
  ERROR: 'Erreur', NOUVEAU: 'Nouveau', A_QUALIFIER: 'À qualifier', VALIDE: 'Validé',
  PUBLIE: 'Publié', ARCHIVE: 'Archivé', REJETE: 'Rejeté', FAIBLE: 'Faible',
  MOYENNE: 'Moyenne', ELEVEE: 'Élevée', CRITIQUE: 'Critique', ADMIN: 'Administrateur',
  RESPONSABLE_VEILLE: 'Responsable de veille', OPERATEUR_VEILLE: 'Opérateur de veille',
  REFERENT_LABORATOIRE: 'Référent de laboratoire', LECTEUR: 'Lecteur',
  IMPORT_MANUEL: 'Import manuel', SCIENTIFIQUE: 'Scientifique', REGLEMENTAIRE: 'Réglementaire',
  TECHNIQUE: 'Technique', AUTRE: 'Autre', SOURCE: 'Source', TOPIC: 'Thème', EMAIL: 'Courriel',
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

function fieldLabel(key: string) {
  if (fieldLabels[key]) return fieldLabels[key];
  const text = key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function readableReference(value: unknown, key: string): string | null {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) return null;
  if (['ownerId', 'userId', 'reviewerId'].includes(key)) return userLabels.value.get(id) ?? null;
  if (key === 'watchItemId') return watchItemLabels.value.get(id) ?? null;
  return null;
}

function formatDetailValue(value: unknown, key = ''): string {
  if (value === null || value === undefined || value === '') return 'Non renseigné';
  const reference = readableReference(value, key);
  if (reference) return reference;
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') {
    if (valueLabels[value]) return valueLabels[value];
    if ((key.endsWith('At') || key.endsWith('Date')) && !Number.isNaN(Date.parse(value))) return formatDate(value);
    return value;
  }
  if (Array.isArray(value)) {
    if (!value.length) return 'Aucun';
    return value.map((entry) => formatDetailValue(entry, key)).join(', ');
  }
  if (typeof value === 'object') {
    const object = value as Record<string, unknown>;
    const preferred = object.label ?? object.name ?? object.title ?? object.email;
    if (preferred != null) return formatDetailValue(preferred);
    return Object.entries(object)
      .map(([childKey, childValue]) => `${fieldLabel(childKey)} : ${formatDetailValue(childValue, childKey)}`)
      .join(' • ');
  }
  return String(value);
}

function auditEntityDisplay(log: AuditLog): string {
  if (log.entityDisplay) return log.entityDisplay;
  const values = { ...asRecord(log.beforeValue), ...asRecord(log.afterValue) };
  const storedLabel = values.title ?? values.name ?? values.label;
  if (typeof storedLabel === 'string' && storedLabel.trim()) return storedLabel;
  if (log.entity === 'users' && log.entityId) return userLabels.value.get(log.entityId) ?? `n° ${log.entityId}`;
  if (log.entity === 'watch_items' && log.entityId) return watchItemLabels.value.get(log.entityId) ?? `n° ${log.entityId}`;
  return log.entityId ? String(log.entityId) : '—';
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

const hasBefore = computed(() => Object.keys(asRecord(selectedLog.value?.beforeValue)).length > 0);
const hasAfter = computed(() => Object.keys(asRecord(selectedLog.value?.afterValue)).length > 0);

const detailTitle = computed(() => {
  if (hasBefore.value && hasAfter.value) return 'Modifications apportées';
  if (hasBefore.value) return 'Informations supprimées';
  if (selectedLog.value?.action.startsWith('CREATE_')) return 'Informations enregistrées';
  return 'Résultat de l’opération';
});

const detailRows = computed<DetailRow[]>(() => {
  const before = asRecord(selectedLog.value?.beforeValue);
  const after = asRecord(selectedLog.value?.afterValue);
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])];
  return keys
    .filter((key) => !hasBefore.value || !hasAfter.value || JSON.stringify(before[key]) !== JSON.stringify(after[key]))
    .map((key) => ({
      key,
      label: fieldLabel(key),
      before: formatDetailValue(before[key], key),
      after: formatDetailValue(after[key], key),
    }));
});

function showDetails(log: AuditLog) {
  selectedLog.value = log;
  detailsVisible.value = true;
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const [auditResult, usersResult, watchItemsResult] = await Promise.allSettled([
      getAuditLogs(),
      getUsers(),
      getWatchItems(),
    ]);
    if (auditResult.status === 'rejected') throw auditResult.reason;
    logs.value = auditResult.value.data;
    if (usersResult.status === 'fulfilled') {
      userLabels.value = new Map(usersResult.value.data.map((user) => [
        user.id,
        `${user.firstName} ${user.lastName}`.trim() || user.email,
      ]));
    }
    if (watchItemsResult.status === 'fulfilled') {
      watchItemLabels.value = new Map(watchItemsResult.value.data.map((item) => [item.id, item.title]));
    }
  }
  catch { error.value = 'Impossible de charger le journal d’audit.'; }
  finally { loading.value = false; }
}

onMounted(load);
</script>

<template>
  <AppLayout>
    <div class="space-y-5">
      <div>
        <h2 class="text-2xl font-bold text-slate-900">Journal d’audit</h2>
        <p class="text-sm text-slate-600">Historique des opérations sensibles effectuées dans l’application.</p>
      </div>

      <Message v-if="error" severity="error">{{ error }}</Message>

      <nav class="flex w-full gap-2 overflow-x-auto rounded-xl bg-white p-2 shadow-sm" aria-label="Filtrer le journal d’audit">
        <Button
          v-for="group in auditGroups"
          :key="group.key"
          :label="group.label"
          size="small"
          :severity="activeGroup === group.key ? 'primary' : 'secondary'"
          :outlined="activeGroup !== group.key"
          class="min-w-max flex-1 !px-3 !py-1.5"
          :aria-pressed="activeGroup === group.key"
          @click="activeGroup = group.key"
        />
      </nav>

      <div class="rounded-xl bg-white p-5 shadow-sm">
        <DataTable :key="activeGroup" :value="filteredLogs" :loading="loading" paginator :rows="20" :rows-per-page-options="[10, 20, 50]" striped-rows size="small">
          <template #empty>Aucune opération enregistrée dans cette partie.</template>
          <Column header="Action"><template #body="{ data }">{{ actionLabels[data.action] ?? data.action }}</template></Column>
          <Column header="Élément"><template #body="{ data }">{{ entityLabels[data.entity] ?? data.entity }}</template></Column>
          <Column header="Identifiant"><template #body="{ data }">{{ data.entityId ?? '—' }}</template></Column>
          <Column header="Utilisateur"><template #body="{ data }">{{ data.user ? `${data.user.firstName} ${data.user.lastName}` : 'Système' }}</template></Column>
          <Column header="Date"><template #body="{ data }">{{ formatDate(data.createdAt) }}</template></Column>
          <Column header="Détails">
            <template #body="{ data }">
              <Button icon="pi pi-eye" severity="secondary" text rounded aria-label="Afficher les détails" title="Afficher les détails" @click="showDetails(data)" />
            </template>
          </Column>
        </DataTable>
      </div>
    </div>

    <Dialog v-model:visible="detailsVisible" modal header="Détails de l’opération" class="w-[min(92vw,760px)]">
      <div v-if="selectedLog" class="space-y-4 text-sm">
        <div class="grid gap-3 sm:grid-cols-2">
          <div><span class="text-slate-500">Action</span><p class="font-semibold">{{ actionLabels[selectedLog.action] ?? selectedLog.action }}</p></div>
          <div><span class="text-slate-500">Utilisateur</span><p class="font-semibold">{{ selectedLog.user ? `${selectedLog.user.firstName} ${selectedLog.user.lastName}` : 'Système' }}</p></div>
          <div><span class="text-slate-500">Élément concerné</span><p class="font-semibold">{{ entityLabels[selectedLog.entity] ?? selectedLog.entity }} : {{ auditEntityDisplay(selectedLog) }}</p></div>
          <div><span class="text-slate-500">Date</span><p class="font-semibold">{{ formatDate(selectedLog.createdAt) }}</p></div>
        </div>

        <div v-if="detailRows.length" class="space-y-4">
          <section v-if="hasBefore" class="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
            <h3 class="border-b border-slate-200 px-3 py-2.5 font-semibold text-slate-800">
              Avant modification
            </h3>
            <div class="divide-y divide-slate-200">
              <div v-for="row in detailRows" :key="`before-${row.key}`" class="flex items-start gap-3 px-3 py-2.5">
                <span class="min-w-0 flex-1 font-medium text-slate-700">{{ row.label }}</span>
                <i class="pi pi-arrow-right mt-1 text-xs text-slate-400" aria-hidden="true" />
                <span class="min-w-0 flex-1 break-words text-right text-slate-900">{{ row.before }}</span>
              </div>
            </div>
          </section>

          <section v-if="hasAfter" class="overflow-hidden rounded-lg border border-emerald-200 bg-emerald-50">
            <h3 class="border-b border-emerald-200 px-3 py-2.5 font-semibold text-emerald-900">
              {{ hasBefore ? 'Après modification' : detailTitle }}
            </h3>
            <div class="divide-y divide-emerald-200">
              <div v-for="row in detailRows" :key="`after-${row.key}`" class="flex items-start gap-3 px-3 py-2.5">
                <span class="min-w-0 flex-1 font-medium text-slate-700">{{ row.label }}</span>
                <i class="pi pi-arrow-right mt-1 text-xs text-emerald-600" aria-hidden="true" />
                <span class="min-w-0 flex-1 break-words text-right font-medium text-slate-900">{{ row.after }}</span>
              </div>
            </div>
          </section>
        </div>

        <p v-else class="rounded-lg bg-slate-100 px-3 py-3 text-slate-600">
          Aucune information complémentaire n’est disponible.
        </p>
        <p v-if="selectedLog.ipAddress" class="text-xs text-slate-500">Adresse réseau : {{ selectedLog.ipAddress }}</p>
      </div>
    </Dialog>
  </AppLayout>
</template>
