import {
  BadGatewayException,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import Parser from 'rss-parser';

import {
  BaseConnector,
  CollectionResult,
  ConnectorTestResult,
  ExternalItem,
} from '../interfaces/connector.interface';
import { safeGet } from '../utils/safe-http-client';

interface RssConnectorConfig {
  feedUrl: string;
}

export class RssConnector implements BaseConnector {
  private readonly parser = new Parser();

  constructor(private readonly config: RssConnectorConfig) {}

  private async loadFeed(): Promise<ExternalItem[]> {
    let url: URL;

    try {
      url = new URL(this.config.feedUrl);
    } catch {
      throw new BadRequestException("L'URL du flux est invalide.");
    }

    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new BadRequestException(
        "L'URL du flux doit utiliser HTTP ou HTTPS.",
      );
    }

    const attempts = 3;

    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        const response = await safeGet(url.toString(), {
          headers: {
            Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, application/feed+json, application/json, text/csv, application/csv',
            'User-Agent': 'VeilleISO17025/1.0',
          },
          timeoutMs: 15000,
        });

        if (!response.ok) {
          if (response.status === 402 && url.hostname.toLowerCase() === 'rss.app') {
            throw new BadGatewayException(
              'RSS.app refuse actuellement l’accès à ce flux (HTTP 402). Vérifiez l’état du flux et du compte RSS.app.',
            );
          }
          const retryable =
            response.status === 429 ||
            response.status === 502 ||
            response.status === 503 ||
            response.status === 504;

          if (retryable && attempt < attempts) {
            await this.wait(attempt * 1000);
            continue;
          }

          throw new BadGatewayException(
            `Le serveur du flux a renvoyé une erreur HTTP ${response.status}.`,
          );
        }

        const content = await response.text();
        const header = response.headers['content-type'];
        const contentType = Array.isArray(header) ? header[0] : header;
        const format = this.detectFormat(content, url, contentType);
        if (format === 'JSON') return this.parseJson(content);
        if (format === 'CSV') return this.parseCsv(content);

        const feed = await this.parser.parseString(content);
        return feed.items.map((item) => ({
          externalId: item.guid ?? item.id ?? item.link,
          title: item.title ?? 'Sans titre',
          summary: item.contentSnippet ?? item.content ?? '',
          url: item.link,
          publishedAt: this.parseDate(item.isoDate ?? item.pubDate),
          raw: item,
        }));
      } catch (error) {
        if (
          error instanceof BadRequestException ||
          error instanceof BadGatewayException
        ) {
          throw error;
        }

        if (attempt < attempts) {
          await this.wait(attempt * 1000);
          continue;
        }

        throw new ServiceUnavailableException(
          'Le flux est temporairement inaccessible. Vérifiez son adresse puis réessayez.',
        );
      }
    }

    throw new ServiceUnavailableException(
      'Le flux est temporairement inaccessible.',
    );
  }

  private detectFormat(content: string, url: URL, contentType?: string): 'XML' | 'JSON' | 'CSV' {
    const mediaType = contentType?.toLowerCase() ?? '';
    if (mediaType.includes('json')) return 'JSON';
    if (mediaType.includes('csv')) return 'CSV';
    if (mediaType.includes('xml') || mediaType.includes('rss') || mediaType.includes('atom')) return 'XML';

    const extension = url.pathname.toLowerCase();
    if (extension.endsWith('.json')) return 'JSON';
    if (extension.endsWith('.csv')) return 'CSV';
    if (extension.endsWith('.xml') || extension.endsWith('.rss') || extension.endsWith('.atom')) return 'XML';

    const trimmed = content.replace(/^\uFEFF/, '').trimStart();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'JSON';
    if (trimmed.startsWith('<')) return 'XML';

    const firstLine = trimmed.split(/\r?\n/, 1)[0]?.toLowerCase() ?? '';
    if (
      ['title', 'titre', 'headline', 'name'].some((header) => firstLine.includes(header)) &&
      [',', ';', '\t'].some((delimiter) => firstLine.includes(delimiter))
    ) return 'CSV';

    throw new BadRequestException(
      'Le format du flux n’a pas pu être reconnu. Formats acceptés : XML, JSON et CSV.',
    );
  }

  private parseJson(content: string): ExternalItem[] {
    let document: unknown;
    try {
      document = JSON.parse(content);
    } catch {
      throw new BadRequestException("La réponse n'est pas un flux JSON valide.");
    }
    if (Array.isArray(document)) return this.mapJsonItems(document);
    const candidates = this.findJsonItems(document);
    if (!candidates) {
      throw new BadRequestException(
        'La réponse JSON doit contenir une liste d’articles (par exemple « items », « results », « data » ou « hydra:member »).',
      );
    }
    return this.mapJsonItems(candidates);
  }

  private findJsonItems(value: unknown, depth = 0): unknown[] | undefined {
    if (Array.isArray(value)) return value;
    if (!value || typeof value !== 'object' || depth > 4) return undefined;

    const object = value as Record<string, unknown>;
    const listKeys = [
      'items',
      'entries',
      'results',
      'articles',
      'records',
      'docs',
      'hydra:member',
      'value',
    ];
    for (const key of listKeys) {
      if (Array.isArray(object[key])) return object[key] as unknown[];
    }

    // De nombreuses API REST placent leur liste dans data, result ou response.
    for (const key of ['data', 'result', 'response', 'collection', 'channel']) {
      const nested = this.findJsonItems(object[key], depth + 1);
      if (nested) return nested;
    }

    return undefined;
  }

  private mapJsonItems(candidates: unknown[]): ExternalItem[] {
    return candidates.map((value) => {
      const item = (value ?? {}) as Record<string, unknown>;
      const url = this.firstText(item, [
        'url', 'link', 'external_url', 'html_url', 'web_url', 'uri', 'links',
      ]);
      return {
        externalId: this.firstText(item, [
          'id', 'guid', 'externalId', 'external_id', 'uuid',
        ]) || url,
        doi: this.firstText(item, ['doi', 'DOI']),
        title: this.firstText(item, [
          'title', 'name', 'headline', 'label', 'title.rendered',
        ]) || 'Sans titre',
        summary: this.stripHtml(this.firstText(item, [
          'summary', 'description', 'abstract', 'excerpt', 'snippet', 'body',
          'content_text', 'content_html', 'content',
        ])),
        url: url ?? this.firstText(item, ['link.href']),
        publishedAt: this.parseDate(this.firstText(item, [
          'date_published', 'publishedAt', 'published_at', 'pubDate', 'date',
          'publication_date', 'created_at', 'published',
        ])),
        language: this.firstText(item, ['language', 'lang', 'language_code']),
        raw: item,
      };
    });
  }

  private parseCsv(content: string): ExternalItem[] {
    const rows = this.csvRows(content.replace(/^\uFEFF/, ''));
    if (rows.length < 2) return [];
    const headers = rows[0].map((header) => this.normalizeHeader(header));
    const titleIndex = headers.findIndex((header) => ['title', 'titre', 'name', 'headline'].includes(header));
    if (titleIndex < 0) {
      throw new BadRequestException('Le flux CSV doit contenir une colonne « title » ou « titre ».');
    }
    return rows.slice(1).filter((row) => row.some((cell) => cell.trim())).map((row) => {
      const item = Object.fromEntries(headers.map((header, index) => [header, row[index] ?? '']));
      const url = this.firstText(item, ['url', 'link', 'lien', 'adresse']);
      return {
        externalId: this.firstText(item, ['id', 'guid', 'external_id', 'externalid']) || url,
        title: row[titleIndex]?.trim() || 'Sans titre',
        summary: this.stripHtml(this.firstText(item, ['summary', 'resume', 'description', 'content'])),
        url,
        publishedAt: this.parseDate(this.firstText(item, [
          'date_published', 'published_date', 'published_at', 'publishedat', 'pubdate',
          'datepublished', 'publication', 'date',
        ])),
        language: this.firstText(item, ['language', 'langue', 'lang']),
        raw: item,
      };
    });
  }

  private csvRows(content: string): string[][] {
    const firstLine = content.split(/\r?\n/, 1)[0] ?? '';
    const delimiters = [',', ';', '\t'];
    const delimiter = delimiters.reduce((best, candidate) =>
      firstLine.split(candidate).length > firstLine.split(best).length ? candidate : best, ',');
    const rows: string[][] = [];
    let row: string[] = [];
    let cell = '';
    let quoted = false;
    for (let index = 0; index < content.length; index++) {
      const char = content[index];
      if (char === '"') {
        if (quoted && content[index + 1] === '"') { cell += '"'; index++; }
        else quoted = !quoted;
      } else if (char === delimiter && !quoted) {
        row.push(cell); cell = '';
      } else if ((char === '\r' || char === '\n') && !quoted) {
        if (char === '\r' && content[index + 1] === '\n') index++;
        row.push(cell); cell = '';
        if (row.some((value) => value.trim())) rows.push(row);
        row = [];
      } else cell += char;
    }
    row.push(cell);
    if (row.some((value) => value.trim())) rows.push(row);
    return rows;
  }

  private normalizeHeader(value: string) {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
      .replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  }

  private firstText(item: Record<string, unknown>, keys: string[]) {
    for (const key of keys) {
      const value = item[key];
      if (typeof value === 'string' && value.trim()) return value.trim();
      if (typeof value === 'number') return String(value);
      if (Array.isArray(value)) {
        for (const entry of value) {
          if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
            const candidate = entry as Record<string, unknown>;
            const relation = candidate.rel;
            const href = candidate.href ?? candidate.url;
            if (
              typeof href === 'string' && href.trim() &&
              (key !== 'links' || !relation || relation === 'alternate')
            ) return href.trim();
          }
        }
      }
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const nested = value as Record<string, unknown>;
        for (const nestedKey of ['rendered', 'text', 'value', 'href', 'url', 'name', 'label']) {
          const candidate = nested[nestedKey];
          if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
        }
      }
    }
    return undefined;
  }

  private parseDate(value?: string) {
    if (!value) return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  private stripHtml(value?: string) {
    return value?.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim();
  }

  private wait(milliseconds: number) {
    return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
  }

  async testConnection(): Promise<ConnectorTestResult> {
    try {
      await this.loadFeed();

      return {
        success: true,
        message: 'Le flux est accessible et son format a été reconnu.',
      };
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Impossible de lire le flux.',
      };
    }
  }

  async collect(): Promise<CollectionResult> {
    return {
      items: await this.loadFeed(),
    };
  }
}
