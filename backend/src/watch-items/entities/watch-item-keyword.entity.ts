import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

import { WatchItem } from './watch-item.entity';

import { Keyword } from '../../taxonomy/entities/keyword.entity';

@Entity('watch_item_keywords')
export class WatchItemKeyword {
  @PrimaryColumn({
    name: 'watch_item_id',
  })
  watchItemId: number;

  @PrimaryColumn({
    name: 'keyword_id',
  })
  keywordId: number;

  @ManyToOne(() => WatchItem, (item) => item.keywordLinks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'watch_item_id',
  })
  watchItem: WatchItem;

  @ManyToOne(() => Keyword, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'keyword_id',
  })
  keyword: Keyword;

  @Column({
    type: 'numeric',
    precision: 5,
    scale: 4,
    nullable: true,
  })
  confidence: number | null;

  @Column({
    length: 30,
    default: 'HUMAN',
  })
  origin: string;
}
