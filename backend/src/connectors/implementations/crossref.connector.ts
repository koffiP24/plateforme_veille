import {
  BadGatewayException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';

import {
  BaseConnector,
  CollectionResult,
  ConnectorTestResult,
  ExternalItem,
} from '../interfaces/connector.interface';
import { safeGet, SafeHttpResponse } from '../utils/safe-http-client';
import { crossrefSearchQuery, parseSearchSubjects } from '../utils/content-filter';

interface CrossrefConnectorConfig {
  baseUrl?: string;
  query?: string;
  rows?: number;
  mailto?: string;
}

export class CrossrefConnector implements BaseConnector {
  private readonly logger = new Logger(CrossrefConnector.name);

  constructor(private readonly config: CrossrefConnectorConfig) {}

  private get worksUrl() {
    const configured = this.config.baseUrl ?? 'https://api.crossref.org';
    const url = new URL(configured);
    if (url.protocol !== 'https:' || url.hostname.toLowerCase() !== 'api.crossref.org' || url.username || url.password || url.hash ||
      !/^\/(?:v1\/)?(?:$|works\/?$|(?:journals|members|funders|prefixes|types)\/[^/]+\/works\/?$)/.test(url.pathname)) {
      throw new BadGatewayException(
        "Utilisez une URL de recherche de l’API Crossref (https://api.crossref.org/works).",
      );
    }
    if (url.pathname === '/' || url.pathname === '/v1/') url.pathname = `${url.pathname}works`;
    return url;
  }

  private buildUrl(searchSubject?: string) {
    const url = this.worksUrl;

    if (!url.searchParams.has('rows')) {
      url.searchParams.set('rows', String(this.config.rows ?? 10));
    }

    if (this.config.query && !url.searchParams.has('query') && !url.searchParams.has('query.bibliographic')) {
      const searchQuery = searchSubject ?? crossrefSearchQuery(this.config.query);
      if (searchQuery) url.searchParams.set('query', searchQuery);
    }

    if (this.config.mailto && !url.searchParams.has('mailto')) {
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
          this.logger.warn(
            `Tentative Crossref ${attempt}/${attempts} échouée : ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
          await this.wait(attempt * 1000);
          continue;
        }

        this.logger.error(
          `Échec Crossref après ${attempts} tentatives`,
          error instanceof Error ? error.stack : String(error),
        );

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
      const url = this.worksUrl;

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
    const configuredUrl = this.worksUrl;
    const hasEmbeddedQuery = configuredUrl.searchParams.has('query') ||
      configuredUrl.searchParams.has('query.bibliographic');
    const subjects = !hasEmbeddedQuery && this.config.query
      ? parseSearchSubjects(this.config.query)
      : [];
    const queries = subjects.length ? subjects : [undefined];
    const crossrefItems: any[] = [];
    const seenDois = new Set<string>();

    // Crossref n'interprète pas une liste de sujets comme une recherche en OU.
    // Une requête par sujet évite de perdre ceux qui ne figurent pas dans le premier résultat.
    for (let index = 0; index < queries.length; index += 3) {
      const batch = queries.slice(index, index + 3);
      const responses = await Promise.all(batch.map((subject) =>
        this.request(this.buildUrl(subject))));
      for (const response of responses) {
        const data = JSON.parse(await response.text()) as any;
        for (const item of data.message?.items ?? []) {
          const doi = typeof item.DOI === 'string' ? item.DOI.toLowerCase() : '';
          if (doi && seenDois.has(doi)) continue;
          if (doi) seenDois.add(doi);
          crossrefItems.push(item);
        }
      }
    }

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
