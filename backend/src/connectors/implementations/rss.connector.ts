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

  private async loadFeed() {
    let url: URL;

    try {
      url = new URL(this.config.feedUrl);
    } catch {
      throw new BadRequestException("L'URL du flux RSS/Atom est invalide.");
    }

    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new BadRequestException(
        "L'URL du flux RSS/Atom doit utiliser HTTP ou HTTPS.",
      );
    }

    const attempts = 3;

    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        const response = await safeGet(url.toString(), {
          headers: {
            Accept:
              'application/rss+xml, application/atom+xml, application/xml, text/xml',
            'User-Agent': 'VeilleISO17025/1.0',
          },
          timeoutMs: 15000,
        });

        if (!response.ok) {
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
            `Le serveur du flux RSS/Atom a renvoyé une erreur HTTP ${response.status}.`,
          );
        }

        return await this.parser.parseString(await response.text());
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
          'Le flux RSS/Atom est temporairement inaccessible. Vérifiez son adresse puis réessayez.',
        );
      }
    }

    throw new ServiceUnavailableException(
      'Le flux RSS/Atom est temporairement inaccessible.',
    );
  }

  private wait(milliseconds: number) {
    return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
  }

  async testConnection(): Promise<ConnectorTestResult> {
    try {
      await this.loadFeed();

      return {
        success: true,
        message: 'Le flux RSS/Atom est accessible.',
      };
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Impossible de lire le flux RSS/Atom.',
      };
    }
  }

  async collect(): Promise<CollectionResult> {
    const feed = await this.loadFeed();

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
