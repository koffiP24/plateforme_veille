import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Topic } from '../../taxonomy/entities/topic.entity';
import { Source } from '../../sources/entities/source.entity';
import { Keyword } from '../../taxonomy/entities/keyword.entity';
import { Domain } from '../../taxonomy/entities/domain.entity';
@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn() id: number;
  @Column({ name: 'subscription_type', length: 30 }) subscriptionType: string;
  @Column({ length: 20, default: 'IN_APP' }) channel: string;
  @Column({ default: true }) active: boolean;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
  @ManyToOne(() => Topic, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'topic_id' })
  topic: Topic | null;
  @ManyToOne(() => Source, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'source_id' })
  source: Source | null;
  @ManyToOne(() => Keyword, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'keyword_id' })
  keyword: Keyword | null;
  @ManyToOne(() => Domain, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'domain_id' })
  domain: Domain | null;
}
