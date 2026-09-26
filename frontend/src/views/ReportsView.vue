<script setup lang="ts">
import {
  onMounted,
  ref,
  watch,
} from 'vue';

import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import Tag from 'primevue/tag';

import {
  useToast,
} from 'primevue/usetoast';

import DownloadIcon from '@primeicons/vue/download';
import FileExportIcon from '@primeicons/vue/file-export';

import AppLayout from '../layouts/AppLayout.vue';
import PageHeader from '../components/ui/PageHeader.vue';
import SectionCard from '../components/ui/SectionCard.vue';

import {
  labelFr,
  optionsFr,
} from '../i18n/labels';

import {
  downloadReport,
  generateReport,
  getReports,
} from '../services/reports.service';

import {
  statusSeverity,
} from '../utils/status-severity';


interface ReportItem {
  id:
  number;

  reportType:
  string;

  format:
  'PDF'
  |
  'XLSX'
  |
  'CSV';

  generatedAt:
  string;

  filePath:
  string;

  periodStart:
  string;

  periodEnd:
  string;

  status:
  string;
}


interface WritableFile {
  write(
    data:
      Blob,
  ):
    Promise<void>;

  close():
    Promise<void>;
}


interface SaveFileHandle {
  createWritable():
    Promise<WritableFile>;
}


type SavePickerWindow =
  Window & {
    showSaveFilePicker?:
    (
      options: {
        suggestedName:
        string;

        types:
        Array<{
          description:
          string;

          accept:
          Record<
            string,
            string[]
          >;
        }>;
      },
    ) =>
      Promise<SaveFileHandle>;
  };


const reports =
  ref<ReportItem[]>([]);

const toast =
  useToast();

const loading =
  ref(false);

const generating =
  ref(false);

const downloading =
  ref<number[]>([]);


function isoDate(
  date:
    Date,
) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}


function isoWeek(
  date:
    Date,
) {
  const current =
    new Date(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
      ),
    );


  const day =
    current.getUTCDay()
    ||
    7;


  current.setUTCDate(
    current.getUTCDate()
    +
    4
    -
    day,
  );


  const yearStart =
    new Date(
      Date.UTC(
        current.getUTCFullYear(),
        0,
        1,
      ),
    );


  const week =
    Math.ceil(
      (
        (
          (
            current.getTime()
            -
            yearStart.getTime()
          )
          /
          86400000
        )
        +
        1
      )
      /
      7,
    );


  return `${current.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}


const today =
  new Date();


const selectedMonth =
  ref(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`,
  );


const selectedWeek =
  ref(
    isoWeek(
      today,
    ),
  );


const form =
  ref({
    reportType:
      'WEEKLY',

    periodStart:
      '',

    periodEnd:
      '',

    format:
      'PDF',
  });


const reportTypeOptions =
  optionsFr([
    'WEEKLY',
    'MONTHLY',
    'CUSTOM',
  ]);


const formatOptions = [
  'PDF',
  'XLSX',
  'CSV',
];


const dateFormatter =
  new Intl.DateTimeFormat(
    'fr-FR',
    {
      dateStyle:
        'short',

      timeStyle:
        'short',
    },
  );


function formatDate(
  value:
    string
    |
    null
    |
    undefined,
) {
  if (
    !value
  ) {
    return 'Non renseignée';
  }

  const date =
    new Date(
      value,
    );

  return Number.isNaN(
    date.getTime(),
  )
    ? 'Non renseignée'
    : dateFormatter.format(
      date,
    );
}


function fileExtension(
  format:
    ReportItem['format'],
) {
  return format.toLowerCase();
}


function contentType(
  format:
    ReportItem['format'],
) {
  if (
    format ===
    'PDF'
  ) {
    return 'application/pdf';
  }

  if (
    format ===
    'XLSX'
  ) {
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  }

  return 'text/csv';
}


function reportFileName(
  reportType:
    string,

  periodStart:
    string,

  periodEnd:
    string,

  format:
    ReportItem['format'],
) {
  const cleanType =
    labelFr(
      reportType,
    )
      .normalize(
        'NFD',
      )
      .replace(
        /[\u0300-\u036f]/g,
        '',
      )
      .toLowerCase()
      .replace(
        /[^a-z0-9]+/g,
        '-',
      );


  return `rapport-veille-${cleanType}-${periodStart}-au-${periodEnd}.${fileExtension(format)}`;
}


function formatPeriod(
  report:
    ReportItem,
) {
  const formatter =
    new Intl.DateTimeFormat(
      'fr-FR',
      {
        dateStyle:
          'short',

        timeZone:
          'UTC',
      },
    );


  return `Du ${formatter.format(new Date(`${report.periodStart}T00:00:00Z`))} au ${formatter.format(new Date(`${report.periodEnd}T00:00:00Z`))}`;
}


function applyAutomaticPeriod() {
  if (
    form.value.reportType ===
    'MONTHLY'
  ) {
    const [
      year,
      month,
    ] =
      selectedMonth.value
        .split(
          '-',
        )
        .map(
          Number,
        );

    if (
      !year
      ||
      !month
    ) {
      return;
    }

    form.value.periodStart =
      `${year}-${String(month).padStart(2, '0')}-01`;

    form.value.periodEnd =
      isoDate(
        new Date(
          Date.UTC(
            year,
            month,
            0,
          ),
        ),
      );

    return;
  }


  if (
    form.value.reportType ===
    'WEEKLY'
  ) {
    const match =
      selectedWeek.value.match(
        /^(\d{4})-W(\d{2})$/,
      );

    if (
      !match
    ) {
      return;
    }


    const year =
      Number(
        match[1],
      );

    const week =
      Number(
        match[2],
      );


    const januaryFourth =
      new Date(
        Date.UTC(
          year,
          0,
          4,
        ),
      );


    const monday =
      new Date(
        januaryFourth,
      );


    monday.setUTCDate(
      januaryFourth.getUTCDate()
      -
      (
        januaryFourth.getUTCDay()
        ||
        7
      )
      +
      1
      +
      (
        week - 1
      )
      *
      7,
    );


    const sunday =
      new Date(
        monday,
      );


    sunday.setUTCDate(
      monday.getUTCDate()
      +
      6,
    );


    form.value.periodStart =
      isoDate(
        monday,
      );

    form.value.periodEnd =
      isoDate(
        sunday,
      );
  }
}


watch(
  [
    () =>
      form.value.reportType,

    selectedMonth,

    selectedWeek,
  ],

  applyAutomaticPeriod,

  {
    immediate:
      true,
  },
);


async function chooseDestination(
  format:
    ReportItem['format'],

  suggestedName:
    string,
) {
  const picker =
    (
      window as
      SavePickerWindow
    ).showSaveFilePicker;


  if (
    !picker
  ) {
    return undefined;
  }


  try {
    return await picker({
      suggestedName,

      types: [
        {
          description:
            `Rapport ${format}`,

          accept: {
            [
              contentType(
                format,
              )
            ]: [
                `.${fileExtension(format)}`,
              ],
          },
        },
      ],
    });

  } catch (
  error
  ) {
    if (
      error instanceof
      DOMException
      &&
      error.name ===
      'AbortError'
    ) {
      return null;
    }

    throw error;
  }
}


function buildAndValidateBlob(
  data:
    ArrayBuffer,

  format:
    ReportItem['format'],
) {
  const bytes =
    new Uint8Array(
      data,
    );


  const valid =
    format ===
      'PDF'

      ? bytes.length >=
      5
      &&
      String.fromCharCode(
        ...bytes.slice(
          0,
          5,
        ),
      ) ===
      '%PDF-'

      : format ===
        'XLSX'

        ? bytes.length >=
        2
        &&
        bytes[0] ===
        0x50
        &&
        bytes[1] ===
        0x4b

        : bytes.length >
        0;


  if (
    !valid
  ) {
    throw new Error(
      `Le fichier ${format} reçu est invalide.`,
    );
  }


  return new Blob(
    [
      data,
    ],

    {
      type:
        contentType(
          format,
        ),
    },
  );
}


async function saveBlob(
  data:
    ArrayBuffer,

  format:
    ReportItem['format'],

  fileName:
    string,

  destination?:
    SaveFileHandle,
) {
  const blob =
    buildAndValidateBlob(
      data,
      format,
    );


  if (
    destination
  ) {
    const writable =
      await destination.createWritable();

    await writable.write(
      blob,
    );

    await writable.close();

    return;
  }


  const url =
    URL.createObjectURL(
      blob,
    );


  const link =
    document.createElement(
      'a',
    );


  link.href =
    url;

  link.download =
    fileName;

  link.click();


  URL.revokeObjectURL(
    url,
  );
}


async function load() {
  loading.value =
    true;

  try {
    reports.value =
      (
        await getReports()
      ).data;

  } finally {
    loading.value =
      false;
  }
}


async function download(
  report:
    ReportItem,
) {
  const fileName =
    reportFileName(
      report.reportType,
      report.periodStart,
      report.periodEnd,
      report.format,
    );


  const destination =
    await chooseDestination(
      report.format,
      fileName,
    );


  if (
    destination ===
    null
  ) {
    return;
  }


  downloading.value = [
    ...downloading.value,
    report.id,
  ];


  try {
    const response =
      await downloadReport(
        report.id,
      );


    await saveBlob(
      response.data,
      report.format,
      fileName,
      destination,
    );


    await load();


    toast.add({
      severity:
        'success',

      summary:
        'Rapport enregistré',

      detail:
        `${fileName} a été enregistré avec succès.`,

      life:
        4000,
    });

  } catch {
    toast.add({
      severity:
        'error',

      summary:
        'Téléchargement impossible',

      detail:
        'Le rapport n’a pas pu être enregistré.',

      life:
        4000,
    });

  } finally {
    downloading.value =
      downloading.value.filter(
        (
          id,
        ) =>
          id !==
          report.id,
      );
  }
}


async function generate() {
  const format =
    form.value.format as
    ReportItem['format'];


  const suggestedName =
    reportFileName(
      form.value.reportType,
      form.value.periodStart,
      form.value.periodEnd,
      format,
    );


  const destination =
    await chooseDestination(
      format,
      suggestedName,
    );


  if (
    destination ===
    null
  ) {
    return;
  }


  generating.value =
    true;


  try {
    const response =
      await generateReport({
        reportType:
          form.value.reportType,

        periodStart:
          form.value.periodStart,

        periodEnd:
          form.value.periodEnd,

        format:
          form.value.format,
      });


    const report =
      response.data as
      ReportItem;


    await load();


    try {
      const file =
        await downloadReport(
          report.id,
        );


      await saveBlob(
        file.data,
        format,
        suggestedName,
        destination,
      );


      toast.add({
        severity:
          'success',

        summary:
          'Rapport généré et enregistré',

        detail:
          `${suggestedName} est prêt à être consulté.`,

        life:
          4500,
      });

    } catch {
      toast.add({
        severity:
          'warn',

        summary:
          'Rapport généré',

        detail:
          'Le rapport a été créé, mais son enregistrement sur l’ordinateur a échoué. Utilisez le bouton Télécharger pour réessayer.',

        life:
          6000,
      });
    }

  } catch {
    toast.add({
      severity:
        'error',

      summary:
        'Génération impossible',

      detail:
        'Le rapport n’a pas pu être généré ou enregistré.',

      life:
        4500,
    });

  } finally {
    generating.value =
      false;
  }
}


onMounted(
  load,
);
</script>


<template>
  <AppLayout>

    <div class="reports-page">

      <PageHeader title="Rapports" subtitle="Générez et téléchargez les synthèses de veille selon la période souhaitée."
        eyebrow="Diffusion" icon="pi pi-chart-bar" />


      <SectionCard title="Générer un rapport"
        icon="pi pi-file-export">

        <div class="report-form">

          <div class="field-group select-host">

            <label class="required-label">
              Périodicité
            </label>

            <div class="select-host">
              <Select append-to="self" id="report-type" v-model="form.reportType
              " :options="reportTypeOptions
                " option-label="label" option-value="value" placeholder="Sélectionner une périodicité" class="w-full" />
            </div>

          </div>


          <div class="field-group">

            <label :class="{ 'required-label': form.reportType === 'MONTHLY' }">
              Mois
            </label>

            <InputText v-model="selectedMonth
              " type="month" class="w-full" :disabled="form.reportType !==
                'MONTHLY'
                " />

          </div>


          <div class="field-group">

            <label :class="{ 'required-label': form.reportType === 'WEEKLY' }">
              Semaine
            </label>

            <InputText v-model="selectedWeek
              " type="week" class="w-full" :disabled="form.reportType !==
                'WEEKLY'
                " />

          </div>


          <div class="field-group">

            <label :class="{ 'required-label': form.reportType === 'CUSTOM' }">
              Date de début
            </label>

            <InputText v-model="form.periodStart
              " type="date" class="w-full" :disabled="form.reportType !==
                'CUSTOM'
                " />

          </div>


          <div class="field-group">

            <label :class="{ 'required-label': form.reportType === 'CUSTOM' }">
              Date de fin
            </label>

            <InputText v-model="form.periodEnd
              " type="date" class="w-full" :disabled="form.reportType !==
                'CUSTOM'
                " :min="form.periodStart
                " />

          </div>


          <div class="field-group select-host">

            <label class="required-label">
              Format
            </label>

            <div class="select-host">
              <Select append-to="self" v-model="form.format
              " :options="formatOptions
                " placeholder="Format" class="w-full" />
            </div>

          </div>

        </div>


        <div class="report-helper">

          <i class="pi pi-info-circle" />

          <span>
            Les dates sont calculées automatiquement pour les rapports
            hebdomadaires et mensuels. Elles restent modifiables pour une période personnalisée.
          </span>

        </div>


        <Button label="Générer et enregistrer" :loading="generating
          " :disabled="!form.periodStart
            ||
            !form.periodEnd
            " @click="
            generate
          ">
          <template #icon>
            <FileExportIcon size="0.9rem" />
          </template>
        </Button>

      </SectionCard>


      <SectionCard :title="`${reports.length} rapport${reports.length > 1 ? 's' : ''}`
        " subtitle="Historique des rapports générés." icon="pi pi-folder">

        <DataTable :value="reports
          " :loading="loading
            " paginator :rows="10
            ">

          <template #empty>
            Aucun rapport généré pour le moment.
          </template>


          <Column header="Rapport">
            <template #body="{ data }">

              <div class="report-name">

                <i class="pi pi-file" />

                <strong>
                  Rapport
                  {{
                    labelFr(
                      data.reportType,
                    )
                  }}
                </strong>

              </div>

            </template>
          </Column>


          <Column header="Périodicité">
            <template #body="{ data }">
              {{
                labelFr(
                  data.reportType,
                )
              }}
            </template>
          </Column>


          <Column header="Période" style="min-width: 12rem">
            <template #body="{ data }">
              <span class="secondary-text">
                {{
                  formatPeriod(
                    data,
                  )
                }}
              </span>
            </template>
          </Column>


          <Column field="format" header="Format" style="width: 6rem" />


          <Column header="Statut" style="width: 8rem">
            <template #body="{ data }">
              <Tag :value="labelFr(
                data.status,
              )
                " :severity="statusSeverity(
                  data.status,
                )
                  " />
            </template>
          </Column>


          <Column header="Généré le">
            <template #body="{ data }">
              <span class="secondary-text">
                {{
                  formatDate(
                    data.generatedAt,
                  )
                }}
              </span>
            </template>
          </Column>


          <Column header="Actions">
            <template #body="{ data }">

              <Button label="Télécharger" size="small" severity="secondary" :loading="downloading.includes(
                data.id,
              )
                " @click="
                  download(
                    data,
                  )
                  ">
                <template #icon>
                  <DownloadIcon size="0.8rem" />
                </template>
              </Button>

            </template>
          </Column>

        </DataTable>

      </SectionCard>

    </div>

  </AppLayout>
</template>


<style scoped>
.reports-page {
  display:
    grid;

  gap:
    1rem;
}

:deep(.section-card) {
  overflow:
    visible;
}

.report-form {
  display:
    grid;

  grid-template-columns:
    repeat(3,
      minmax(0,
        1fr));

  gap:
    0.8rem;

  margin-bottom:
    0.9rem;
}

.field-group {
  display:
    grid;

  gap:
    0.4rem;
}

.field-group label {
  color:
    var(--app-text-secondary);

  font-size:
    0.7rem;

  font-weight:
    700;
}

.report-helper {
  display:
    flex;

  max-width:
    50rem;

  align-items:
    flex-start;

  gap:
    0.45rem;

  margin-bottom:
    0.8rem;

  color:
    var(--app-text-muted);

  font-size:
    0.68rem;

  line-height:
    1.5;
}

.report-helper i {
  margin-top:
    0.1rem;

  color:
    var(--app-primary);
}

.report-name {
  display:
    flex;

  align-items:
    center;

  gap:
    0.45rem;
}

.report-name i {
  color:
    var(--app-primary);
}

.report-name strong {
  color:
    var(--app-text);

  font-size:
    0.74rem;
}

.secondary-text {
  color:
    var(--app-text-muted);

  font-size:
    0.69rem;
}


/* SELECT FIX */

.select-host {
  position:
    relative;

  overflow:
    visible;

  isolation:
    isolate;

  z-index:
    10;
}

.select-host :deep(.p-select-overlay) {
  position:
    absolute !important;

  left:
    0 !important;

  right:
    auto !important;

  transform:
    none !important;

  width:
    100% !important;

  min-width:
    100% !important;

  z-index:
    10000 !important;
}

@media (max-width: 900px) {
  .report-form {
    grid-template-columns:
      repeat(2,
        minmax(0,
          1fr));
  }
}

@media (max-width: 600px) {
  .report-form {
    grid-template-columns:
      1fr;
  }
}
</style>
