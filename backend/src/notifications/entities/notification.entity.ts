import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { WatchItem } from '../../watch-items/entities/watch-item.entity';
@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn() id: number;
  @Column({ length: 200 }) title: string;
  @Column({ type: 'text' }) message: string;
  @Column({ length: 20, default: 'IN_APP' }) channel: string;
  @Column({ length: 20, default: 'PENDING' }) status: string;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt: Date | null;
  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt: Date | null;
  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
  @ManyToOne(() => WatchItem, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'watch_item_id' })
  watchItem: WatchItem | null;
}
