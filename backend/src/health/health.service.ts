import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { Connector } from '../connectors/entities/connector.entity';

@Injectable()
export class HealthService {
  constructor(
    private readonly database: DataSource,
    @InjectRepository(Connector)
    private readonly connectors: Repository<Connector>,
  ) {}

  async get() {
    let database = 'UP';
    let connectors: Connector[] = [];

    try {
      await this.database.query('SELECT 1');
      connectors = await this.connectors.find({ relations: { source: true } });
    } catch {
      database = 'DOWN';
    }

    return {
      status: database === 'UP' ? 'UP' : 'DEGRADED',
      database,
      connectors: connectors.map((connector) => ({
        id: connector.id,
        source: connector.source?.name,
        status: connector.status,
        lastSyncAt: connector.lastSyncAt,
      })),
    };
  }
}
