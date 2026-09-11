export interface NormalizedWatchItem {
  sourceId: number;

  externalId: string | null;

  doi: string | null;

  title: string;

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
