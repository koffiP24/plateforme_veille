import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Source } from '../../sources/entities/source.entity';

@Entity('collection_runs')
export class CollectionRun {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'started_at',
    type: 'timestamptz',
  })
  startedAt: Date;

  @Column({
    name: 'ended_at',
    type: 'timestamptz',
    nullable: true,
  })
  endedAt: Date | null;

  @Column({
    length: 50,
  })
  status: string;

  @Column({
    name: 'received_count',
    default: 0,
  })
  receivedCount: number;

  @Column({
    name: 'new_count',
    default: 0,
  })
  newCount: number;

  @Column({
    name: 'updated_count',
    default: 0,
  })
  updatedCount: number;

  @Column({
    name: 'duplicate_count',
    default: 0,
  })
  duplicateCount: number;

  @Column({
    name: 'error_count',
    default: 0,
  })
  errorCount: number;

  @Column({
    name: 'error_message',
    type: 'text',
    nullable: true,
  })
  errorMessage: string | null;

  @ManyToOne(() => Source, {
    nullable: false,
  })
  @JoinColumn({
    name: 'source_id',
  })
  source: Source;
}
