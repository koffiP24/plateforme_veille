import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Keyword } from './keyword.entity';

@Entity('keyword_synonyms')
export class KeywordSynonym {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    length: 150,
  })
  label: string;

  @ManyToOne(() => Keyword, (keyword) => keyword.synonyms, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'keyword_id',
  })
  keyword: Keyword;
}
