import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { WatchItem } from './watch-item.entity';

@Entity('watch_versions')
export class WatchVersion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    length: 64,
  })
  hash: string;

  @Column({
    name: 'payload_snapshot',
    type: 'jsonb',
  })
  payloadSnapshot: Record<string, unknown>;

  @CreateDateColumn({
    name: 'detected_at',
    type: 'timestamptz',
  })
  detectedAt: Date;

  @ManyToOne(() => WatchItem, (item) => item.versions, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'watch_item_id',
  })
  watchItem: WatchItem;
}
