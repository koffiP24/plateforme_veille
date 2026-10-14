export interface NormalizedWatchItem {
  sourceId: number;

  externalId: string | null;

  doi: string | null;

  title: string;

  originalTitle?: string | null;

  originalSummary?: string | null;

  originalLanguage?: string | null;

  frenchTitle?: string | null;

  frenchSummary?: string | null;

  summary: string | null;

  url: string | null;

  canonicalUrl: string | null;

  publishedAt: Date | null;

  collectedAt: Date;

  language: string | null;

  watchType: string;

  status: string;

  fingerprint: string;
}
