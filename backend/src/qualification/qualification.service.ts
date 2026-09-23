import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';

import { In, Repository } from 'typeorm';

import { WatchItem } from '../watch-items/entities/watch-item.entity';

import { WatchItemTopic } from '../watch-items/entities/watch-item-topic.entity';

import { WatchItemKeyword } from '../watch-items/entities/watch-item-keyword.entity';

import { Topic } from '../taxonomy/entities/topic.entity';

import { Keyword } from '../taxonomy/entities/keyword.entity';

import { Domain } from '../taxonomy/entities/domain.entity';

import { Laboratory } from '../taxonomy/entities/laboratory.entity';

import { QualifyWatchItemDto } from './dto/qualify-watch-item.dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class QualificationService {
  constructor(
    @InjectRepository(WatchItem)
    private readonly itemRepository: Repository<WatchItem>,

    @InjectRepository(WatchItemTopic)
    private readonly topicLinkRepository: Repository<WatchItemTopic>,

    @InjectRepository(WatchItemKeyword)
    private readonly keywordLinkRepository: Repository<WatchItemKeyword>,

    @InjectRepository(Topic)
    private readonly topicRepository: Repository<Topic>,

    @InjectRepository(Keyword)
    private readonly keywordRepository: Repository<Keyword>,

    @InjectRepository(Domain)
    private readonly domainRepository: Repository<Domain>,

    @InjectRepository(Laboratory)
    private readonly laboratoryRepository: Repository<Laboratory>,

    private readonly auditService: AuditService,
  ) {}

  async qualify(itemId: number, dto: QualifyWatchItemDto, userId?: number) {
    const item = await this.itemRepository.findOne({
      where: {
        id: itemId,
      },

      relations: {
        domains: true,
        laboratories: true,
      },
    });

    if (!item) {
      throw new NotFoundException('Élément de veille introuvable');
    }

    if (!['NOUVEAU', 'A_QUALIFIER'].includes(item.status)) {
      throw new ConflictException(
        'Cet élément ne peut plus être qualifié dans son état actuel.',
      );
    }

    const beforeValue = {
      watchType: item.watchType,
      relevance: item.relevance,
      criticality: item.criticality,
      status: item.status,
      domainIds: item.domains.map((domain) => domain.id),
      laboratoryIds: item.laboratories.map((laboratory) => laboratory.id),
    };

    const topics = dto.topicIds.length
      ? await this.topicRepository.findBy({
          id: In(dto.topicIds),
        })
      : [];

    const keywords = dto.keywordIds.length
      ? await this.keywordRepository.findBy({
          id: In(dto.keywordIds),
        })
      : [];

    const domains = dto.domainIds.length
      ? await this.domainRepository.findBy({
          id: In(dto.domainIds),
        })
      : [];

    const laboratories = dto.laboratoryIds.length
      ? await this.laboratoryRepository.findBy({
          id: In(dto.laboratoryIds),
        })
      : [];

    if (
      topics.length !== dto.topicIds.length ||
      keywords.length !== dto.keywordIds.length ||
      domains.length !== dto.domainIds.length ||
      laboratories.length !== dto.laboratoryIds.length
    ) {
      throw new BadRequestException(
        'Une ou plusieurs valeurs de taxonomie sont invalides.',
      );
    }

    item.watchType = dto.watchType ?? item.watchType;

    item.relevance = dto.relevance ?? item.relevance;

    item.criticality = dto.criticality ?? item.criticality;

    item.domains = domains;

    item.laboratories = laboratories;

    item.status = 'A_QUALIFIER';

    await this.itemRepository.save(item);

    await this.topicLinkRepository.delete({
      watchItemId: item.id,
    });

    await this.keywordLinkRepository.delete({
      watchItemId: item.id,
    });

    if (topics.length) {
      await this.topicLinkRepository.save(
        topics.map((topic) =>
          this.topicLinkRepository.create({
            watchItemId: item.id,

            topicId: topic.id,

            watchItem: item,

            topic,

            confidence: 1,

            origin: 'HUMAN',
          }),
        ),
      );
    }

    if (keywords.length) {
      await this.keywordLinkRepository.save(
        keywords.map((keyword) =>
          this.keywordLinkRepository.create({
            watchItemId: item.id,

            keywordId: keyword.id,

            watchItem: item,

            keyword,

            confidence: 1,

            origin: 'HUMAN',
          }),
        ),
      );
    }

    const qualified = await this.getQualification(item.id);

    await this.auditService.log({
      userId,
      action: 'QUALIFY_WATCH_ITEM',
      entity: 'watch_items',
      entityId: item.id,
      beforeValue,
      afterValue: {
        watchType: qualified.watchType,
        relevance: qualified.relevance,
        criticality: qualified.criticality,
        status: qualified.status,
        domainIds: qualified.domains.map((domain) => domain.id),
        laboratoryIds: qualified.laboratories.map((laboratory) => laboratory.id),
        topicIds: qualified.topicLinks.map((link) => link.topic.id),
        keywordIds: qualified.keywordLinks.map((link) => link.keyword.id),
      },
    });

    return qualified;
  }

  async getQualification(itemId: number) {
    const item = await this.itemRepository.findOne({
      where: {
        id: itemId,
      },

      relations: {
        source: true,
        domains: true,
        laboratories: true,

        topicLinks: {
          topic: true,
        },

        keywordLinks: {
          keyword: true,
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Élément introuvable');
    }

    return item;
  }
}
