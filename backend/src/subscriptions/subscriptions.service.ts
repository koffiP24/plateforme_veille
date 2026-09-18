import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription } from './entities/subscription.entity';
import { User } from '../users/entities/user.entity';
import { Topic } from '../taxonomy/entities/topic.entity';
import { Source } from '../sources/entities/source.entity';
import { Keyword } from '../taxonomy/entities/keyword.entity';
import { Domain } from '../taxonomy/entities/domain.entity';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(Subscription) private repo: Repository<Subscription>,
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(Topic) private topics: Repository<Topic>,
    @InjectRepository(Source) private sources: Repository<Source>,
    @InjectRepository(Keyword) private keywords: Repository<Keyword>,
    @InjectRepository(Domain) private domains: Repository<Domain>,
  ) {}

  async options() {
    const [sources, topics, domains, keywords] = await Promise.all([
      this.sources.find({
        where: { active: true },
        select: { id: true, name: true },
        order: { name: 'ASC' },
      }),
      this.topics.find({
        select: { id: true, label: true },
        order: { label: 'ASC' },
      }),
      this.domains.find({
        where: { active: true },
        select: { id: true, name: true },
        order: { name: 'ASC' },
      }),
      this.keywords.find({
        where: { active: true },
        select: { id: true, label: true },
        order: { label: 'ASC' },
      }),
    ]);

    return { sources, topics, domains, keywords };
  }

  async create(userId: number, dto: CreateSubscriptionDto) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    const s = this.repo.create({
      subscriptionType: dto.subscriptionType,
      channel: dto.channel,
      active: true,
      user,
      topic: null,
      source: null,
      keyword: null,
      domain: null,
    });
    if (dto.subscriptionType === 'TOPIC' && dto.topicId)
      s.topic = await this.topics.findOne({ where: { id: dto.topicId } });
    if (dto.subscriptionType === 'SOURCE' && dto.sourceId)
      s.source = await this.sources.findOne({ where: { id: dto.sourceId } });
    if (dto.subscriptionType === 'KEYWORD' && dto.keywordId)
      s.keyword = await this.keywords.findOne({ where: { id: dto.keywordId } });
    if (dto.subscriptionType === 'DOMAIN' && dto.domainId)
      s.domain = await this.domains.findOne({ where: { id: dto.domainId } });
    if (!s.topic && !s.source && !s.keyword && !s.domain)
      throw new BadRequestException(
        'La cible de l’abonnement est obligatoire.',
      );
    return this.repo.save(s);
  }
  list(userId: number) {
    return this.repo.find({
      where: { user: { id: userId } },
      relations: { topic: true, source: true, keyword: true, domain: true },
    });
  }
  async remove(userId: number, id: number) {
    const s = await this.repo.findOne({ where: { id, user: { id: userId } } });
    if (!s) throw new NotFoundException('Abonnement introuvable');
    await this.repo.remove(s);
    return { success: true };
  }
}
