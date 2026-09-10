import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Connector } from './entities/connector.entity';

import { Source } from '../sources/entities/source.entity';

import { CreateConnectorDto } from './dto/create-connector.dto';

import { BaseConnector } from './interfaces/connector.interface';

import { ManualConnector } from './implementations/manual.connector';
import { RssConnector } from './implementations/rss.connector';
import { CrossrefConnector } from './implementations/crossref.connector';

@Injectable()
export class ConnectorsService {
  constructor(
    @InjectRepository(Connector)
    private readonly connectorRepository: Repository<Connector>,

    @InjectRepository(Source)
    private readonly sourceRepository: Repository<Source>,
  ) {}

  async create(dto: CreateConnectorDto) {
    const source = await this.sourceRepository.findOne({
      where: {
        id: dto.sourceId,
      },
    });

    if (!source) {
      throw new NotFoundException('Source introuvable');
    }

    const connector = this.connectorRepository.create({
      connectorType: dto.connectorType,

      cursor: null,

      lastSyncAt: null,

      status: 'NOT_TESTED',

      config: dto.config ?? null,

      source,
    });

    return this.connectorRepository.save(connector);
  }

  findAll() {
    return this.connectorRepository.find({
      relations: {
        source: true,
      },

      order: {
        id: 'DESC',
      },
    });
  }

  async findOne(id: number) {
    const connector = await this.connectorRepository.findOne({
      where: { id },

      relations: {
        source: true,
      },
    });

    if (!connector) {
      throw new NotFoundException('Connecteur introuvable');
    }

    return connector;
  }

  private buildImplementation(connector: Connector): BaseConnector {
    const config = connector.config ?? {};

    switch (connector.connectorType) {
      case 'IMPORT_MANUEL':
        return new ManualConnector();

      case 'RSS':
      case 'ATOM': {
        const feedUrl = config.feedUrl;

        if (typeof feedUrl !== 'string') {
          throw new BadRequestException(
            'feedUrl est obligatoire pour un connecteur RSS/Atom.',
          );
        }

        return new RssConnector({ feedUrl });
      }

      case 'API': {
        const provider = config.provider;

        if (provider === 'CROSSREF') {
          return new CrossrefConnector({
            baseUrl:
              typeof config.baseUrl === 'string' ? config.baseUrl : undefined,
            query: typeof config.query === 'string' ? config.query : undefined,
            rows: typeof config.rows === 'number' ? config.rows : 10,
            mailto:
              typeof config.mailto === 'string' ? config.mailto : undefined,
          });
        }

        throw new BadRequestException(
          `Provider API non supporté : ${String(provider)}`,
        );
      }

      default:
        throw new BadRequestException(
          `Type de connecteur non supporté : ${connector.connectorType}`,
        );
    }
  }

  async testConnection(id: number) {
    const connector = await this.findOne(id);

    const implementation = this.buildImplementation(connector);

    const result = await implementation.testConnection();

    connector.status = result.success ? 'AVAILABLE' : 'ERROR';

    await this.connectorRepository.save(connector);

    return result;
  }

  async collect(id: number) {
    const connector = await this.findOne(id);

    const implementation = this.buildImplementation(connector);

    try {
      connector.status = 'RUNNING';

      await this.connectorRepository.save(connector);

      const result = await implementation.collect();

      connector.status = 'AVAILABLE';

      connector.lastSyncAt = new Date();

      if (result.nextCursor) {
        connector.cursor = result.nextCursor;
      }

      await this.connectorRepository.save(connector);

      return {
        connectorId: connector.id,

        sourceId: connector.source.id,

        collectedAt: connector.lastSyncAt,

        count: result.items.length,

        items: result.items,
      };
    } catch (error) {
      connector.status = 'ERROR';

      await this.connectorRepository.save(connector);

      throw error;
    }
  }
}
