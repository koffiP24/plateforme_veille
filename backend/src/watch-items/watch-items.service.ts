import { Injectable, NotFoundException } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { Source } from '../sources/entities/source.entity';

import { WatchItem } from './entities/watch-item.entity';

import { WatchVersion } from './entities/watch-version.entity';

import { DeduplicationService } from './deduplication.service';

import { NormalizedWatchItem } from './interfaces/normalized-watch-item.interface';

export type IngestionResult = 'CREE' | 'MIS_A_JOUR' | 'DOUBLON';

@Injectable()
export class WatchItemsService {
  constructor(
    @InjectRepository(WatchItem)
    private readonly watchItemRepository: Repository<WatchItem>,

    @InjectRepository(WatchVersion)
    private readonly versionRepository: Repository<WatchVersion>,

    private readonly deduplicationService: DeduplicationService,
  ) {}

  async ingest(
    source: Source,
    normalized: NormalizedWatchItem,
  ): Promise<IngestionResult> {
    const existing = await this.deduplicationService.findExisting(normalized);

    if (!existing) {
      const watchItem = this.watchItemRepository.create({
        externalId: normalized.externalId,

        doi: normalized.doi,

        title: normalized.title,

        summary: normalized.summary,

        url: normalized.url,

        canonicalUrl: normalized.canonicalUrl,

        publishedAt: normalized.publishedAt,

        collectedAt: normalized.collectedAt,

        language: normalized.language,

        watchType: normalized.watchType,

        status: normalized.status,

        fingerprint: normalized.fingerprint,

        source,
      });

      const saved = await this.watchItemRepository.save(watchItem);

      await this.createVersion(saved, normalized);

      return 'CREE';
    }

    if (existing.fingerprint === normalized.fingerprint) {
      return 'DOUBLON';
    }

    existing.externalId = normalized.externalId;

    existing.doi = normalized.doi;

    existing.title = normalized.title;

    existing.summary = normalized.summary;

    existing.url = normalized.url;

    existing.canonicalUrl = normalized.canonicalUrl;

    existing.publishedAt = normalized.publishedAt;

    existing.collectedAt = normalized.collectedAt;

    existing.language = normalized.language;

    existing.watchType = normalized.watchType;

    existing.fingerprint = normalized.fingerprint;

    const saved = await this.watchItemRepository.save(existing);

    await this.createVersion(saved, normalized);

    return 'MIS_A_JOUR';
  }

  private async createVersion(
    watchItem: WatchItem,
    normalized: NormalizedWatchItem,
  ) {
    const version = this.versionRepository.create({
      hash: normalized.fingerprint,

      payloadSnapshot: {
        externalId: normalized.externalId,

        doi: normalized.doi,

        title: normalized.title,

        summary: normalized.summary,

        url: normalized.url,

        canonicalUrl: normalized.canonicalUrl,

        publishedAt: normalized.publishedAt?.toISOString() ?? null,

        language: normalized.language,

        watchType: normalized.watchType,
      },

      watchItem,
    });

    await this.versionRepository.save(version);
  }

  findAll() {
    return this.watchItemRepository.find({
      relations: {
        source: true,
      },

      order: {
        collectedAt: 'DESC',
      },

      take: 100,
    });
  }

  async findOne(id: number) {
    const item = await this.watchItemRepository.findOne({
      where: { id },

      relations: {
        source: true,
        versions: true,
      },
    });

    if (!item) {
      throw new NotFoundException('Élément de veille introuvable');
    }

    return item;
  }

  async findOneForRoles(id: number, roles: string[]) {
    const item = await this.findOne(id);
    const hasInternalRole = [
      'ADMIN',
      'RESPONSABLE_VEILLE',
      'REFERENT_LABORATOIRE',
      'OPERATEUR_VEILLE',
    ].some((role) => roles.includes(role));

    if (!hasInternalRole && item.status !== 'PUBLIE') {
      throw new NotFoundException('Élément de veille introuvable');
    }

    return item;
  }
}
