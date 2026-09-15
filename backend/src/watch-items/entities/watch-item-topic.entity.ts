import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

import { WatchItem } from './watch-item.entity';

import { Topic } from '../../taxonomy/entities/topic.entity';

@Entity('watch_item_topics')
export class WatchItemTopic {
  @PrimaryColumn({
    name: 'watch_item_id',
  })
  watchItemId: number;

  @PrimaryColumn({
    name: 'topic_id',
  })
  topicId: number;

  @ManyToOne(() => WatchItem, (item) => item.topicLinks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'watch_item_id',
  })
  watchItem: WatchItem;

  @ManyToOne(() => Topic, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'topic_id',
  })
  topic: Topic;

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
