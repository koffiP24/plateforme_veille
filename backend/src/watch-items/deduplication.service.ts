import { Injectable } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { WatchItem } from './entities/watch-item.entity';

import { NormalizedWatchItem } from './interfaces/normalized-watch-item.interface';

@Injectable()
export class DeduplicationService {
  constructor(
    @InjectRepository(WatchItem)
    private readonly watchItemRepository: Repository<WatchItem>,
  ) {}

  async findExisting(item: NormalizedWatchItem): Promise<WatchItem | null> {
    if (item.externalId) {
      const existing = await this.watchItemRepository.findOne({
        where: {
          externalId: item.externalId,

          source: {
            id: item.sourceId,
          },
        },
        relations: {
          source: true,
        },
      });

      if (existing) {
        return existing;
      }
    }

    if (item.doi) {
      const existing = await this.watchItemRepository.findOne({
        where: {
          doi: item.doi,
        },
        relations: {
          source: true,
        },
      });

      if (existing) {
        return existing;
      }
    }

    if (item.canonicalUrl) {
      const existing = await this.watchItemRepository.findOne({
        where: {
          canonicalUrl: item.canonicalUrl,
        },
        relations: {
          source: true,
        },
      });

      if (existing) {
        return existing;
      }
    }

    return this.watchItemRepository.findOne({
      where: {
        fingerprint: item.fingerprint,
      },
      relations: {
        source: true,
      },
    });
  }
}
