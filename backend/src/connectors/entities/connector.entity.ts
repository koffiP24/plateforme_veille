import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Source } from '../../sources/entities/source.entity';

@Entity('connectors')
export class Connector {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'connector_type',
    length: 50,
  })
  connectorType: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  cursor: string | null;

  @Column({
    name: 'last_sync_at',
    type: 'timestamptz',
    nullable: true,
  })
  lastSyncAt: Date | null;

  @Column({
    length: 50,
    default: 'NOT_TESTED',
  })
  status: string;

  @Column({
    type: 'jsonb',
    nullable: true,
  })
  config: Record<string, unknown> | null;

  @ManyToOne(() => Source, (source) => source.connectors, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'source_id',
  })
  source: Source;
}
