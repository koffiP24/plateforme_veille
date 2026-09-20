import {
  BadGatewayException,
  ServiceUnavailableException,
} from '@nestjs/common';

import {
  BaseConnector,
  CollectionResult,
  ConnectorTestResult,
  ExternalItem,
} from '../interfaces/connector.interface';
import { safeGet, SafeHttpResponse } from '../utils/safe-http-client';

interface CrossrefConnectorConfig {
  baseUrl?: string;
  query?: string;
  rows?: number;
  mailto?: string;
}

export class CrossrefConnector implements BaseConnector {
  constructor(private readonly config: CrossrefConnectorConfig) {}

  private get baseUrl() {
    const configured = this.config.baseUrl ?? 'https://api.crossref.org';
    const url = new URL(configured);
    if (url.protocol !== 'https:' || url.hostname.toLowerCase() !== 'api.crossref.org') {
      throw new BadGatewayException(
        "L'API Crossref doit utiliser https://api.crossref.org.",
      );
    }
    return `${url.protocol}//${url.host}${url.pathname.replace(/\/$/, '')}`;
  }

  private buildUrl() {
    const url = new URL(`${this.baseUrl}/works`);

    url.searchParams.set('rows', String(this.config.rows ?? 10));

    if (this.config.query) {
      url.searchParams.set('query', this.config.query);
    }

    if (this.config.mailto) {
      url.searchParams.set('mailto', this.config.mailto);
    }

    return url.toString();
  }

  private async request(url: string): Promise<SafeHttpResponse> {
    const attempts = 3;

    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        const response = await safeGet(url, {
          headers: {
            Accept: 'application/json',
            'User-Agent': this.config.mailto
              ? `VeilleISO17025/1.0 (mailto:${this.config.mailto})`
              : 'VeilleISO17025/1.0',
          },
          timeoutMs: 15000,
          allowedHosts: ['api.crossref.org'],
        });

        if (response.ok) {
          return response;
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

        if (response.status === 429) {
          throw new ServiceUnavailableException(
            'Crossref limite temporairement les requêtes. Réessayez dans quelques instants.',
          );
        }

        throw new BadGatewayException(
          `Crossref a renvoyé une erreur HTTP ${response.status}.`,
        );
      } catch (error) {
        if (
          error instanceof BadGatewayException ||
          error instanceof ServiceUnavailableException
        ) {
          throw error;
        }

        if (attempt < attempts) {
          await this.wait(attempt * 1000);
          continue;
        }

        throw new ServiceUnavailableException(
          'Crossref est temporairement inaccessible. Vérifiez la connexion Internet puis réessayez.',
        );
      }
    }

    throw new ServiceUnavailableException(
      'Crossref est temporairement inaccessible.',
    );
  }

  private wait(milliseconds: number) {
    return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
  }

  async testConnection(): Promise<ConnectorTestResult> {
    try {
      const url = new URL(`${this.baseUrl}/works`);

      url.searchParams.set('rows', '0');

      if (this.config.mailto) {
        url.searchParams.set('mailto', this.config.mailto);
      }

      await this.request(url.toString());

      return {
        success: true,
        message: 'Connexion à Crossref réussie.',
      };
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Impossible de contacter Crossref.',
      };
    }
  }

  async collect(): Promise<CollectionResult> {
    const response = await this.request(this.buildUrl());

    const data = JSON.parse(await response.text()) as any;

    const crossrefItems = data.message?.items ?? [];

    const items: ExternalItem[] = crossrefItems.map((item: any) => {
      const title = Array.isArray(item.title) ? item.title[0] : item.title;

      const publishedParts = item.published?.['date-parts']?.[0];

      let publishedAt: Date | undefined;

      if (Array.isArray(publishedParts) && publishedParts.length > 0) {
        const [year, month = 1, day = 1] = publishedParts;

        publishedAt = new Date(Date.UTC(year, month - 1, day));
      }

      return {
        externalId: item.DOI,

        doi: item.DOI,

        title: title ?? 'Sans titre',

        summary: item.abstract ?? '',

        url: item.URL,

        language: item.language,

        publishedAt,

        raw: item,
      };
    });

    return {
      items,
    };
  }
}
