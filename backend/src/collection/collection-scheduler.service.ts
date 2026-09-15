import { Injectable, Logger } from '@nestjs/common';

import { Cron, CronExpression } from '@nestjs/schedule';

import { Connector } from '../connectors/entities/connector.entity';

import { CollectionService } from './collection.service';

@Injectable()
export class CollectionSchedulerService {
  private readonly logger = new Logger(CollectionSchedulerService.name);

  constructor(private readonly collectionService: CollectionService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async checkSources() {
    const connectors = await this.collectionService.getActiveConnectors();

    for (const connector of connectors) {
      if (this.isDue(connector)) {
        this.logger.log(`Collecte planifiée : ${connector.source.name}`);

        try {
          await this.collectionService.runConnector(connector.id);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Erreur inconnue';

          this.logger.error(
            `La collecte de ${connector.source.name} a échoué : ${message}`,
          );
        }
      }
    }
  }

  private isDue(connector: Connector): boolean {
    if (!connector.lastSyncAt) {
      return true;
    }

    const interval = this.frequencyToMilliseconds(connector.source.frequency);

    if (!interval) {
      return false;
    }

    const nextRun = connector.lastSyncAt.getTime() + interval;

    return Date.now() >= nextRun;
  }

  private frequencyToMilliseconds(frequency: string | null): number | null {
    if (!frequency) {
      return null;
    }

    const value = frequency.trim().toLowerCase();

    const match = value.match(/^(\d+)(m|h|j|d)$/);

    if (!match) {
      return null;
    }

    const amount = Number(match[1]);

    const unit = match[2];

    switch (unit) {
      case 'm':
        return amount * 60 * 1000;

      case 'h':
        return amount * 60 * 60 * 1000;

      case 'd':
      case 'j':
        return amount * 24 * 60 * 60 * 1000;

      default:
        return null;
    }
  }
}
