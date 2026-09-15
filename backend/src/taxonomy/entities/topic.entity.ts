import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('topics')
export class Topic {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    length: 150,
    unique: true,
  })
  label: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  description: string | null;

  @ManyToOne(() => Topic, (topic) => topic.children, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  parent: Topic | null;

  @OneToMany(() => Topic, (topic) => topic.parent)
  children: Topic[];
}
