<script setup lang="ts">
import { onMounted, ref } from 'vue';
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import { useToast } from 'primevue/usetoast';

import AppLayout from '../layouts/AppLayout.vue';
import { labelFr, optionsFr } from '../i18n/labels';
import { downloadReport, generateReport, getReports } from '../services/reports.service';

interface ReportItem {
  id: number;
  reportType: string;
  format: 'PDF' | 'XLSX' | 'CSV';
  generatedAt: string;
  filePath: string;
  periodStart: string;
  periodEnd: string;
  status: string;
}

interface WritableFile {
  write(data: Blob): Promise<void>;
  close(): Promise<void>;
}

interface SaveFileHandle {
  createWritable(): Promise<WritableFile>;
}

type SavePickerWindow = Window & {
  showSaveFilePicker?: (options: {
    suggestedName: string;
    types: Array<{ description: string; accept: Record<string, string[]> }>;
  }) => Promise<SaveFileHandle>;
};

const reports = ref<ReportItem[]>([]);
const toast = useToast();
const loading = ref(false);
const generating = ref(false);
const downloading = ref<number[]>([]);
const form = ref({ reportType: 'WEEKLY', periodStart: '', periodEnd: '', format: 'PDF' });
const reportTypeOptions = optionsFr(['WEEKLY', 'MONTHLY', 'CUSTOM']);
const formatOptions = ['PDF', 'XLSX', 'CSV'];
const dateFormatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' });

function formatDate(value: string | null | undefined) {
  if (!value) return 'Non renseignée';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Non renseignée' : dateFormatter.format(date);
}

function fileExtension(format: ReportItem['format']) {
  return format.toLowerCase();
}

function contentType(format: ReportItem['format']) {
  if (format === 'PDF') return 'application/pdf';
  if (format === 'XLSX') return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  return 'text/csv';
}

function reportFileName(
  reportType: string,
  periodStart: string,
  periodEnd: string,
  format: ReportItem['format'],
) {
  const cleanType = labelFr(reportType)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');
  return `rapport-veille-${cleanType}-${periodStart}-au-${periodEnd}.${fileExtension(format)}`;
}

function formatPeriod(report: ReportItem) {
  const formatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeZone: 'UTC' });
  return `Du ${formatter.format(new Date(`${report.periodStart}T00:00:00Z`))} au ${formatter.format(new Date(`${report.periodEnd}T00:00:00Z`))}`;
}

async function chooseDestination(format: ReportItem['format'], suggestedName: string) {
  const picker = (window as SavePickerWindow).showSaveFilePicker;
  if (!picker) return undefined;

  try {
    return await picker({
      suggestedName,
      types: [{
        description: `Rapport ${format}`,
        accept: { [contentType(format)]: [`.${fileExtension(format)}`] },
      }],
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return null;
    throw error;
  }
}

function buildAndValidateBlob(data: ArrayBuffer, format: ReportItem['format']) {
  const bytes = new Uint8Array(data);
  const valid = format === 'PDF'
    ? bytes.length >= 5 && String.fromCharCode(...bytes.slice(0, 5)) === '%PDF-'
    : format === 'XLSX'
      ? bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4b
      : bytes.length > 0;

  if (!valid) throw new Error(`Le fichier ${format} reçu est invalide.`);
  return new Blob([data], { type: contentType(format) });
}

async function saveBlob(
  data: ArrayBuffer,
  format: ReportItem['format'],
  fileName: string,
  destination?: SaveFileHandle,
) {
  const blob = buildAndValidateBlob(data, format);
  if (destination) {
    const writable = await destination.createWritable();
    await writable.write(blob);
    await writable.close();
    return;
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

async function load() {
  loading.value = true;
  try { reports.value = (await getReports()).data; }
  finally { loading.value = false; }
}

async function download(report: ReportItem) {
  const fileName = reportFileName(report.reportType, report.periodStart, report.periodEnd, report.format);
  const destination = await chooseDestination(report.format, fileName);
  if (destination === null) return;

  downloading.value = [...downloading.value, report.id];
  try {
    const response = await downloadReport(report.id);
    await saveBlob(response.data, report.format, fileName, destination);
    await load();
    toast.add({
      severity: 'success',
      summary: 'Rapport enregistré',
      detail: `${fileName} a été enregistré avec succès.`,
      life: 4000,
    });
  } catch {
    toast.add({
      severity: 'error',
      summary: 'Téléchargement impossible',
      detail: 'Le rapport n’a pas pu être enregistré.',
      life: 4000,
    });
  } finally {
    downloading.value = downloading.value.filter((id) => id !== report.id);
  }
}

async function generate() {
  const format = form.value.format as ReportItem['format'];
  const suggestedName = reportFileName(
    form.value.reportType,
    form.value.periodStart,
    form.value.periodEnd,
    format,
  );
  const destination = await chooseDestination(format, suggestedName);
  if (destination === null) return;

  generating.value = true;
  try {
    const response = await generateReport(form.value);
    const report = response.data as ReportItem;
    await load();

    try {
      const file = await downloadReport(report.id);
      await saveBlob(file.data, format, suggestedName, destination);
      toast.add({
        severity: 'success',
        summary: 'Rapport généré et enregistré',
        detail: `${suggestedName} est prêt à être consulté.`,
        life: 4500,
      });
    } catch {
      toast.add({
        severity: 'warn',
        summary: 'Rapport généré',
        detail: 'Le rapport a été créé, mais son enregistrement sur l’ordinateur a échoué. Utilisez le bouton Télécharger pour réessayer.',
        life: 6000,
      });
    }
  } catch {
    toast.add({
      severity: 'error',
      summary: 'Génération impossible',
      detail: 'Le rapport n’a pas pu être généré ou enregistré.',
      life: 4500,
    });
  } finally {
    generating.value = false;
  }
}

onMounted(load);
</script>

<template>
  <AppLayout>
    <div class="space-y-5">
      <h2 class="text-2xl font-bold">Rapports</h2>

      <section class="rounded-xl bg-white p-5 shadow-sm">
        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label for="report-type" class="mb-2 block text-sm font-semibold text-slate-700">Périodicité</label>
            <Select id="report-type" v-model="form.reportType" :options="reportTypeOptions" option-label="label"
              option-value="value" placeholder="Périodicité" class="w-full" />
          </div>
          <div>
            <label for="period-start" class="mb-2 block text-sm font-semibold text-slate-700">Date de début</label>
            <InputText id="period-start" v-model="form.periodStart" type="date" class="w-full" />
          </div>
          <div>
            <label for="period-end" class="mb-2 block text-sm font-semibold text-slate-700">Date de fin</label>
            <InputText id="period-end" v-model="form.periodEnd" type="date" class="w-full" />
          </div>
          <div>
            <label for="report-format" class="mb-2 block text-sm font-semibold text-slate-700">Format</label>
            <Select id="report-format" v-model="form.format" :options="formatOptions" placeholder="Format"
              class="w-full" />
          </div>
        </div>
        <Button class="mt-4" label="Générer et enregistrer" icon="pi pi-file-export" :loading="generating"
          :disabled="!form.periodStart || !form.periodEnd" @click="generate" />
      </section>

      <section class="rounded-xl bg-white p-5 shadow-sm">
        <DataTable :value="reports" :loading="loading" paginator :rows="10">
          <template #empty>Aucun rapport généré pour le moment.</template>
          <Column header="Rapport"><template #body="{ data }">Rapport {{ labelFr(data.reportType) }}</template></Column>
          <Column header="Périodicité"><template #body="{ data }">{{ labelFr(data.reportType) }}</template></Column>
          <Column header="Période"><template #body="{ data }">{{ formatPeriod(data) }}</template></Column>
          <Column field="format" header="Format" />
          <Column header="Statut"><template #body="{ data }">{{ labelFr(data.status) }}</template></Column>
          <Column header="Généré le"><template #body="{ data }">{{ formatDate(data.generatedAt) }}</template></Column>
          <Column header="Actions">
            <template #body="{ data }">
              <Button label="Télécharger" icon="pi pi-download" size="small" severity="secondary"
                :loading="downloading.includes(data.id)" @click="download(data)" />
            </template>
          </Column>
        </DataTable>
      </section>
    </div>
  </AppLayout>
</template>
