import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Connector } from '../../connectors/entities/connector.entity';

@Entity('sources')
export class Source {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    length: 150,
  })
  name: string;

  @Column({
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  organization: string | null;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  country: string | null;

  @Column({
    length: 100,
  })
  category: string;

  @Column({
    name: 'source_type',
    length: 50,
  })
  sourceType: string;

  @Column({
    name: 'base_url',
    type: 'text',
    nullable: true,
  })
  baseUrl: string | null;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  frequency: string | null;

  @Column({
    default: true,
  })
  active: boolean;

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

  @OneToMany(() => Connector, (connector) => connector.source)
  connectors: Connector[];
}
