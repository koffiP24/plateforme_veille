import {
  BaseConnector,
  CollectionResult,
  ConnectorTestResult,
  ExternalItem,
} from '../interfaces/connector.interface';

interface CrossrefConnectorConfig {
  baseUrl?: string;
  query?: string;
  rows?: number;
  mailto?: string;
}

export class CrossrefConnector implements BaseConnector {
  constructor(private readonly config: CrossrefConnectorConfig) {}

  private get baseUrl() {
    return this.config.baseUrl ?? 'https://api.crossref.org';
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

  async testConnection(): Promise<ConnectorTestResult> {
    try {
      const url = new URL(`${this.baseUrl}/works`);

      url.searchParams.set('rows', '0');

      if (this.config.mailto) {
        url.searchParams.set('mailto', this.config.mailto);
      }

      const response = await fetch(url);

      if (!response.ok) {
        return {
          success: false,
          message: `Crossref répond avec le statut ${response.status}.`,
        };
      }

      return {
        success: true,
        message: 'Connexion à Crossref réussie.',
      };
    } catch {
      return {
        success: false,
        message: 'Impossible de contacter Crossref.',
      };
    }
  }

  async collect(): Promise<CollectionResult> {
    const response = await fetch(this.buildUrl());

    if (!response.ok) {
      throw new Error(`Erreur Crossref : ${response.status}`);
    }

    const data = (await response.json()) as any;

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

        title: title ?? 'Sans titre',

        summary: item.abstract ?? '',

        url: item.URL,

        publishedAt,

        raw: item,
      };
    });

    return {
      items,
    };
  }
}
