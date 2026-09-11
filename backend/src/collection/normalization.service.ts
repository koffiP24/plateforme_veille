import { Injectable } from '@nestjs/common';

import { createHash } from 'crypto';

import { ExternalItem } from '../connectors/interfaces/connector.interface';

import { Source } from '../sources/entities/source.entity';

import { NormalizedWatchItem } from '../watch-items/interfaces/normalized-watch-item.interface';

@Injectable()
export class NormalizationService {
  normalize(source: Source, item: ExternalItem): NormalizedWatchItem {
    const title = this.cleanText(item.title) || 'Sans titre';

    const summary = this.cleanText(item.summary);

    const doi = this.normalizeDoi(item.doi);

    const canonicalUrl = this.canonicalizeUrl(item.url);

    const fingerprint = this.createFingerprint({
      title,
      summary,
      doi,
      canonicalUrl,
      publishedAt: item.publishedAt,
    });

    return {
      sourceId: source.id,

      externalId: item.externalId?.trim() || null,

      doi,

      title,

      summary: summary || null,

      url: item.url?.trim() || null,

      canonicalUrl,

      publishedAt: item.publishedAt ?? null,

      collectedAt: new Date(),

      language: item.language?.trim() || null,

      watchType: source.category,

      status: 'NOUVEAU',

      fingerprint,
    };
  }

  private cleanText(value?: string): string {
    return value?.replace(/\s+/g, ' ').trim() ?? '';
  }

  private normalizeDoi(doi?: string): string | null {
    if (!doi) {
      return null;
    }

    return doi
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\/(dx\.)?doi\.org\//, '');
  }

  private canonicalizeUrl(value?: string): string | null {
    if (!value) {
      return null;
    }

    try {
      const url = new URL(value);

      const trackingParams = [
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'utm_term',
        'utm_content',
        'fbclid',
        'gclid',
      ];

      for (const parameter of trackingParams) {
        url.searchParams.delete(parameter);
      }

      url.hash = '';

      return url.toString().replace(/\/$/, '');
    } catch {
      return value.trim();
    }
  }

  private createFingerprint(data: {
    title: string;
    summary: string;
    doi: string | null;
    canonicalUrl: string | null;
    publishedAt?: Date;
  }): string {
    const value = [
      data.title.toLowerCase(),
      data.summary.toLowerCase(),
      data.doi ?? '',
      data.canonicalUrl ?? '',
      data.publishedAt?.toISOString() ?? '',
    ].join('|');

    return createHash('sha256').update(value).digest('hex');
  }
}
