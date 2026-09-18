import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { WatchItem } from '../../watch-items/entities/watch-item.entity';
@Entity('favorites')
export class Favorite {
  @PrimaryColumn({ name: 'user_id' }) userId: number;
  @PrimaryColumn({ name: 'watch_item_id' }) watchItemId: number;
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
  @ManyToOne(() => WatchItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'watch_item_id' })
  watchItem: WatchItem;
  @CreateDateColumn({ name: 'added_at', type: 'timestamptz' }) addedAt: Date;
}
