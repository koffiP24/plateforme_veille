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
    switch (connector.connectorType) {
      case 'IMPORT_MANUEL':
        return new ManualConnector();

      default:
        throw new BadRequestException(
          `Le connecteur ${connector.connectorType} n'est pas encore implémenté.`,
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
}
