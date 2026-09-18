import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
@Entity('reports')
export class Report {
  @PrimaryGeneratedColumn() id: number;
  @Column({ length: 200 }) title: string;
  @Column({ name: 'report_type', length: 30 }) reportType: string;
  @Column({ name: 'period_start', type: 'date' }) periodStart: string;
  @Column({ name: 'period_end', type: 'date' }) periodEnd: string;
  @Column({ length: 10 }) format: string;
  @Column({ name: 'file_path', type: 'text' }) filePath: string;
  @Column({ length: 20, default: 'GENERATED' }) status: string;
  @CreateDateColumn({ name: 'generated_at', type: 'timestamptz' })
  generatedAt: Date;
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;
}
