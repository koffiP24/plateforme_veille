import { Injectable, Logger } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { Connector } from '../connectors/entities/connector.entity';

import { ConnectorsService } from '../connectors/connectors.service';

@Injectable()
export class CollectionService {
  private readonly logger = new Logger(CollectionService.name);

  private readonly running = new Set<number>();

  constructor(
    @InjectRepository(Connector)
    private readonly connectorRepository: Repository<Connector>,

    private readonly connectorsService: ConnectorsService,
  ) {}

  async getActiveConnectors() {
    return this.connectorRepository.find({
      relations: {
        source: true,
      },

      where: {
        source: {
          active: true,
        },
      },
    });
  }

  async runConnector(connectorId: number) {
    if (this.running.has(connectorId)) {
      this.logger.warn(`Connecteur ${connectorId} déjà en cours.`);

      return;
    }

    this.running.add(connectorId);

    try {
      const result = await this.connectorsService.collect(connectorId);

      this.logger.log(
        `Connecteur ${connectorId} : ${result.count} élément(s) récupéré(s).`,
      );

      return result;
    } catch (error) {
      this.logger.error(`Erreur de collecte du connecteur ${connectorId}`);
    } finally {
      this.running.delete(connectorId);
    }
  }
}
