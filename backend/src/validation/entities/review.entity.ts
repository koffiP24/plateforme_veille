import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { WatchItem } from '../../watch-items/entities/watch-item.entity';
import { User } from '../../users/entities/user.entity';

@Entity('reviews')
export class Review {
  @PrimaryGeneratedColumn() id: number;
  @Column({ length: 50 }) status: string;
  @Column({ type: 'int', nullable: true }) relevance: number | null;
  @Column({ type: 'varchar', length: 20, nullable: true })
  criticality: string | null;
  @Column({ type: 'text', nullable: true }) comment: string | null;
  @CreateDateColumn({ name: 'reviewed_at', type: 'timestamptz' })
  reviewedAt: Date;

  @ManyToOne(() => WatchItem, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'watch_item_id' })
  watchItem: WatchItem;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'reviewer_id' })
  reviewer: User;
}
