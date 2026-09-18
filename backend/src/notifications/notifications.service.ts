import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { WatchItem } from '../watch-items/entities/watch-item.entity';
import { WatchItemPublishedEvent } from './events/watch-item-published.event';
@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification) private repo: Repository<Notification>,
    @InjectRepository(Subscription) private subs: Repository<Subscription>,
    @InjectRepository(WatchItem) private items: Repository<WatchItem>,
  ) {}
  @OnEvent('watch-item.published') async onPublished(
    e: WatchItemPublishedEvent,
  ) {
    const item = await this.items.findOne({
      where: { id: e.watchItemId },
      relations: {
        source: true,
        domains: true,
        topicLinks: { topic: true },
        keywordLinks: { keyword: true },
      },
    });
    if (!item) return;
    const all = await this.subs.find({
      where: { active: true },
      relations: {
        user: true,
        source: true,
        domain: true,
        topic: true,
        keyword: true,
      },
    });
    for (const s of all) {
      const match =
        (s.subscriptionType === 'SOURCE' && s.source?.id === item.source.id) ||
        (s.subscriptionType === 'DOMAIN' &&
          item.domains.some((d) => d.id === s.domain?.id)) ||
        (s.subscriptionType === 'TOPIC' &&
          item.topicLinks?.some((l) => l.topic.id === s.topic?.id)) ||
        (s.subscriptionType === 'KEYWORD' &&
          item.keywordLinks?.some((l) => l.keyword.id === s.keyword?.id));
      if (match)
        await this.repo.save(
          this.repo.create({
            title: 'Nouvelle veille publiée',
            message: item.title,
            channel: s.channel,
            status: 'SENT',
            sentAt: new Date(),
            readAt: null,
            user: s.user,
            watchItem: item,
          }),
        );
    }
  }
  list(userId: number) {
    return this.repo.find({
      where: { user: { id: userId } },
      relations: { watchItem: true },
      order: { createdAt: 'DESC' },
    });
  }
  async markRead(userId: number, id: number) {
    const n = await this.repo.findOne({ where: { id, user: { id: userId } } });
    if (!n) throw new NotFoundException('Notification introuvable');
    n.readAt = new Date();
    return this.repo.save(n);
  }
}
