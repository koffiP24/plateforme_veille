import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Source } from '../../sources/entities/source.entity';

import { WatchVersion } from './watch-version.entity';

import { JoinTable, ManyToMany } from 'typeorm';

import { Domain } from '../../taxonomy/entities/domain.entity';

import { Laboratory } from '../../taxonomy/entities/laboratory.entity';

import { WatchItemTopic } from './watch-item-topic.entity';

import { WatchItemKeyword } from './watch-item-keyword.entity';

@Entity('watch_items')
export class WatchItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'external_id',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  externalId: string | null;

  @Column({
    length: 255,
    type: 'varchar',
    nullable: true,
  })
  doi: string | null;

  @Column({
    type: 'text',
  })
  title: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  summary: string | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  url: string | null;

  @Column({
    name: 'canonical_url',
    type: 'text',
    nullable: true,
  })
  canonicalUrl: string | null;

  @Column({
    name: 'published_at',
    type: 'timestamptz',
    nullable: true,
  })
  publishedAt: Date | null;

  @Column({
    name: 'collected_at',
    type: 'timestamptz',
  })
  collectedAt: Date;

  @Column({
    length: 20,
    type: 'varchar',
    nullable: true,
  })
  language: string | null;

  @Column({
    name: 'watch_type',
    length: 50,
  })
  watchType: string;

  @Column({
    length: 50,
    default: 'NOUVEAU',
  })
  status: string;

  @Column({
    length: 64,
  })
  fingerprint: string;

  @Column({
    type: 'int',
    nullable: true,
  })
  relevance: number | null;

  @Column({
    length: 20,
    nullable: true,
    type: 'varchar',
  })
  criticality: string | null;

  @ManyToOne(() => Source, {
    nullable: false,
  })
  @JoinColumn({
    name: 'source_id',
  })
  source: Source;

  @OneToMany(() => WatchVersion, (version) => version.watchItem)
  versions: WatchVersion[];

  @OneToMany(() => WatchItemTopic, (link) => link.watchItem)
  topicLinks: WatchItemTopic[];

  @OneToMany(() => WatchItemKeyword, (link) => link.watchItem)
  keywordLinks: WatchItemKeyword[];

  @ManyToMany(() => Domain, (domain) => domain.watchItems)
  @JoinTable({
    name: 'watch_item_domains',

    joinColumn: {
      name: 'watch_item_id',
      referencedColumnName: 'id',
    },

    inverseJoinColumn: {
      name: 'domain_id',
      referencedColumnName: 'id',
    },
  })
  domains: Domain[];

  @ManyToMany(() => Laboratory, (laboratory) => laboratory.watchItems)
  @JoinTable({
    name: 'watch_item_laboratories',

    joinColumn: {
      name: 'watch_item_id',
      referencedColumnName: 'id',
    },

    inverseJoinColumn: {
      name: 'laboratory_id',
      referencedColumnName: 'id',
    },
  })
  laboratories: Laboratory[];

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamptz',
  })
  updatedAt: Date;
}
