import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataSource, Repository } from 'typeorm';
import { WatchItemPublishedEvent } from '../notifications/events/watch-item-published.event';
import { WatchItem } from '../watch-items/entities/watch-item.entity';
import { User } from '../users/entities/user.entity';
import { Review } from './entities/review.entity';
import { ReviewWatchItemDto } from './dto/review-watch-item.dto';
import { WATCH_STATUS } from '../watch-items/constants/watch-status.constants';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ValidationService {
  constructor(
    @InjectRepository(WatchItem)
    private readonly itemRepository: Repository<WatchItem>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
    private readonly auditService: AuditService,
  ) {}

  async review(itemId: number, reviewerId: number, dto: ReviewWatchItemDto) {
    if (dto.decision === 'REJECT' && !dto.comment?.trim()) {
      throw new BadRequestException(
        'Un commentaire est obligatoire pour rejeter un élément.',
      );
    }

    const result = await this.dataSource.transaction(async (manager) => {
      const itemRepo = manager.getRepository(WatchItem);
      const userRepo = manager.getRepository(User);
      const reviewRepo = manager.getRepository(Review);
      const item = await itemRepo.findOne({ where: { id: itemId } });
      if (!item) throw new NotFoundException('Élément de veille introuvable');
      if (item.status !== WATCH_STATUS.TO_QUALIFY) {
        throw new ConflictException(
          'Seul un élément À qualifier peut être validé ou rejeté.',
        );
      }
      const reviewer = await userRepo.findOne({ where: { id: reviewerId } });
      if (!reviewer) throw new NotFoundException('Utilisateur introuvable');
      if (dto.relevance !== undefined) item.relevance = dto.relevance;
      if (dto.criticality !== undefined) item.criticality = dto.criticality;
      const targetStatus =
        dto.decision === 'VALIDATE'
          ? WATCH_STATUS.VALIDATED
          : WATCH_STATUS.REJECTED;
      item.status = targetStatus;
      await itemRepo.save(item);
      const review = reviewRepo.create({
        status: targetStatus,
        relevance: item.relevance ?? null,
        criticality: item.criticality ?? null,
        comment: dto.comment?.trim() || null,
        watchItem: item,
        reviewer,
      });
      return { item, review: await reviewRepo.save(review) };
    });

    await this.auditService.log({
      userId: reviewerId,
      action:
        dto.decision === 'VALIDATE'
          ? 'VALIDATE_WATCH_ITEM'
          : 'REJECT_WATCH_ITEM',
      entity: 'watch_items',
      entityId: result.item.id,
      beforeValue: { status: WATCH_STATUS.TO_QUALIFY },
      afterValue: {
        status: result.item.status,
        relevance: result.item.relevance,
        criticality: result.item.criticality,
      },
    });

    return result;
  }

  async publish(itemId: number, reviewerId: number, comment?: string) {
    const result = await this.changeStatus(
      itemId,
      reviewerId,
      WATCH_STATUS.VALIDATED,
      WATCH_STATUS.PUBLISHED,
      comment,
    );

    await this.auditService.log({
      userId: reviewerId,
      action: 'PUBLISH_WATCH_ITEM',
      entity: 'watch_items',
      entityId: itemId,
      beforeValue: { status: WATCH_STATUS.VALIDATED },
      afterValue: { status: WATCH_STATUS.PUBLISHED },
    });

    this.eventEmitter.emit(
      'watch-item.published',
      new WatchItemPublishedEvent(itemId),
    );

    return result;
  }

  async archive(itemId: number, reviewerId: number, comment?: string) {
    const result = await this.changeStatus(
      itemId,
      reviewerId,
      WATCH_STATUS.PUBLISHED,
      WATCH_STATUS.ARCHIVED,
      comment,
    );
    await this.auditService.log({
      userId: reviewerId,
      action: 'ARCHIVE_WATCH_ITEM',
      entity: 'watch_items',
      entityId: itemId,
      beforeValue: { status: WATCH_STATUS.PUBLISHED },
      afterValue: { status: WATCH_STATUS.ARCHIVED },
    });
    return result;
  }

  private async changeStatus(
    itemId: number,
    reviewerId: number,
    requiredStatus: string,
    targetStatus: string,
    comment?: string,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const itemRepo = manager.getRepository(WatchItem);
      const userRepo = manager.getRepository(User);
      const reviewRepo = manager.getRepository(Review);
      const item = await itemRepo.findOne({ where: { id: itemId } });
      if (!item) throw new NotFoundException('Élément introuvable');
      if (item.status !== requiredStatus)
        throw new ConflictException(
          `Transition impossible depuis ${item.status}.`,
        );
      const reviewer = await userRepo.findOne({ where: { id: reviewerId } });
      if (!reviewer) throw new NotFoundException('Utilisateur introuvable');
      item.status = targetStatus;
      await itemRepo.save(item);
      const review = reviewRepo.create({
        status: targetStatus,
        relevance: item.relevance ?? null,
        criticality: item.criticality ?? null,
        comment: comment?.trim() || null,
        watchItem: item,
        reviewer,
      });
      return { item, review: await reviewRepo.save(review) };
    });
  }

  async findReviews(itemId: number) {
    const item = await this.itemRepository.findOne({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Élément introuvable');
    return this.reviewRepository.find({
      where: { watchItem: { id: itemId } },
      relations: { reviewer: true },
      order: { reviewedAt: 'DESC' },
    });
  }
}
