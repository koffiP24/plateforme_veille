import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { User } from '../users/entities/user.entity';
@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog) private repo: Repository<AuditLog>,
    @InjectRepository(User) private users: Repository<User>,
  ) {}
  async log(data: {
    userId?: number;
    action: string;
    entity: string;
    entityId?: number;
    beforeValue?: any;
    afterValue?: any;
    ipAddress?: string;
  }) {
    const user = data.userId
      ? await this.users.findOne({ where: { id: data.userId } })
      : null;
    return this.repo.save(
      this.repo.create({
        action: data.action,
        entity: data.entity,
        entityId: data.entityId ?? null,
        beforeValue: data.beforeValue ?? null,
        afterValue: data.afterValue ?? null,
        ipAddress: data.ipAddress ?? null,
        user,
      }),
    );
  }
  list() {
    return this.repo.find({
      relations: { user: true },
      order: { createdAt: 'DESC' },
      take: 500,
    });
  }
}
