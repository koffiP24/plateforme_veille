import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

import { KeywordSynonym } from './keyword-synonym.entity';

@Entity('keywords')
export class Keyword {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    length: 150,
    unique: true,
  })
  label: string;

  @Column({
    type: 'numeric',
    precision: 5,
    scale: 2,
    default: 1,
  })
  weight: number;

  @Column({
    default: true,
  })
  active: boolean;

  @OneToMany(() => KeywordSynonym, (synonym) => synonym.keyword, {
    cascade: true,
  })
  synonyms: KeywordSynonym[];
}
