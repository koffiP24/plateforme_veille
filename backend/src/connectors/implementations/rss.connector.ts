// La collecte RSS sera implémentée ici.
import Parser from 'rss-parser';

import {
  BaseConnector,
  CollectionResult,
  ConnectorTestResult,
  ExternalItem,
} from '../interfaces/connector.interface';

interface RssConnectorConfig {
  feedUrl: string;
}

export class RssConnector implements BaseConnector {
  private readonly parser = new Parser();

  constructor(private readonly config: RssConnectorConfig) {}

  async testConnection(): Promise<ConnectorTestResult> {
    try {
      await this.parser.parseURL(this.config.feedUrl);

      return {
        success: true,
        message: 'Le flux RSS/Atom est accessible.',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Impossible de lire le flux RSS/Atom.',
      };
    }
  }

  async collect(): Promise<CollectionResult> {
    const feed = await this.parser.parseURL(this.config.feedUrl);

    const items: ExternalItem[] = feed.items.map((item) => ({
      externalId: item.guid ?? item.id ?? item.link,

      title: item.title ?? 'Sans titre',

      summary: item.contentSnippet ?? item.content ?? '',

      url: item.link,

      publishedAt: item.isoDate ? new Date(item.isoDate) : undefined,

      raw: item,
    }));

    return {
      items,
    };
  }
}
