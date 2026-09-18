import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn() id: number;
  @Column({ length: 80 }) action: string;
  @Column({ length: 80 }) entity: string;
  @Column({ name: 'entity_id', type: 'integer', nullable: true })
  entityId: number | null;
  @Column({ name: 'before_value', type: 'jsonb', nullable: true })
  beforeValue: Record<string, unknown> | null;
  @Column({ name: 'after_value', type: 'jsonb', nullable: true })
  afterValue: Record<string, unknown> | null;
  @Column({ name: 'ip_address', type: 'inet', nullable: true }) ipAddress:
    string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User | null;
}
