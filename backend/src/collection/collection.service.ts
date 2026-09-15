import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';

import { DataSource, QueryRunner, Repository } from 'typeorm';

import { Connector } from '../connectors/entities/connector.entity';

import { ConnectorsService } from '../connectors/connectors.service';

import { WatchItemsService } from '../watch-items/watch-items.service';

import { NormalizationService } from './normalization.service';

import { CollectionRun } from './entities/collection-run.entity';

@Injectable()
export class CollectionService {
  private readonly logger = new Logger(CollectionService.name);

  private readonly running = new Set<number>();

  constructor(
    private readonly dataSource: DataSource,

    @InjectRepository(Connector)
    private readonly connectorRepository: Repository<Connector>,

    @InjectRepository(CollectionRun)
    private readonly runRepository: Repository<CollectionRun>,

    private readonly connectorsService: ConnectorsService,

    private readonly normalizationService: NormalizationService,

    private readonly watchItemsService: WatchItemsService,
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
      return {
        message: 'Une collecte est déjà en cours pour ce connecteur.',
      };
    }

    // Réserver le connecteur avant tout await pour bloquer les requêtes concurrentes.
    this.running.add(connectorId);

    let lockRunner: QueryRunner | null = null;
    let databaseLockAcquired = false;

    try {
      lockRunner = this.dataSource.createQueryRunner();
      await lockRunner.connect();

      const lockResult = (await lockRunner.query(
        'SELECT pg_try_advisory_lock($1, $2) AS acquired',
        [17025, connectorId],
      )) as Array<{ acquired: boolean }>;

      databaseLockAcquired = lockResult[0]?.acquired === true;

      if (!databaseLockAcquired) {
        return {
          message: 'Une collecte est déjà en cours pour ce connecteur.',
        };
      }

      return await this.executeCollection(connectorId);
    } finally {
      if (lockRunner) {
        try {
          if (databaseLockAcquired) {
            await lockRunner.query('SELECT pg_advisory_unlock($1, $2)', [
              17025,
              connectorId,
            ]);
          }
        } finally {
          await lockRunner.release();
        }
      }

      this.running.delete(connectorId);
    }
  }

  private async executeCollection(connectorId: number) {
    const connector = await this.connectorRepository.findOne({
      where: {
        id: connectorId,
      },

      relations: {
        source: true,
      },
    });

    if (!connector) {
      throw new NotFoundException('Connecteur introuvable');
    }

    const run = this.runRepository.create({
      source: connector.source,

      startedAt: new Date(),

      endedAt: null,

      status: 'RUNNING',

      receivedCount: 0,
      newCount: 0,
      updatedCount: 0,
      duplicateCount: 0,
      errorCount: 0,

      errorMessage: null,
    });

    await this.runRepository.save(run);

    try {
      const result = await this.connectorsService.collect(connectorId);

      run.receivedCount = result.items.length;

      for (const externalItem of result.items) {
        try {
          const normalized = this.normalizationService.normalize(
            connector.source,
            externalItem,
          );

          const ingestion = await this.watchItemsService.ingest(
            connector.source,
            normalized,
          );

          switch (ingestion) {
            case 'CREE':
              run.newCount++;
              break;

            case 'MIS_A_JOUR':
              run.updatedCount++;
              break;

            case 'DOUBLON':
              run.duplicateCount++;
              break;
          }
        } catch (error) {
          run.errorCount++;

          this.logger.error('Erreur lors du traitement d’un élément');
        }
      }

      run.status = run.errorCount > 0 ? 'COMPLETED_WITH_ERRORS' : 'COMPLETED';

      run.endedAt = new Date();

      await this.runRepository.save(run);

      return {
        runId: run.id,

        source: connector.source.name,

        received: run.receivedCount,

        created: run.newCount,

        updated: run.updatedCount,

        duplicates: run.duplicateCount,

        errors: run.errorCount,
      };
    } catch (error) {
      run.status = 'ERROR';

      run.endedAt = new Date();

      run.errorCount++;

      run.errorMessage =
        error instanceof Error ? error.message : 'Erreur inconnue';

      await this.runRepository.save(run);

      throw error;
    }
  }

  findRuns() {
    return this.runRepository.find({
      relations: {
        source: true,
      },

      order: {
        startedAt: 'DESC',
      },

      take: 100,
    });
  }
}
