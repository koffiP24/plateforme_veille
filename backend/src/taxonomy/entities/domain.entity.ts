import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';

import { WatchItem } from '../../watch-items/entities/watch-item.entity';

@Entity('domains')
export class Domain {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    length: 150,
    unique: true,
  })
  name: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  description: string | null;

  @Column({
    default: true,
  })
  active: boolean;

  @ManyToMany(() => WatchItem, (item) => item.domains)
  watchItems: WatchItem[];
}
