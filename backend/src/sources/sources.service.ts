import { Injectable, NotFoundException } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Source } from './entities/source.entity';
import { CreateSourceDto } from './dto/create-source.dto';
import { UpdateSourceDto } from './dto/update-source.dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class SourcesService {
  constructor(
    @InjectRepository(Source)
    private readonly sourceRepository: Repository<Source>,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateSourceDto, actorId?: number) {
    const source = this.sourceRepository.create({
      name: dto.name,
      organization: dto.organization ?? null,
      country: dto.country ?? null,
      category: dto.category,
      sourceType: dto.sourceType,
      baseUrl: dto.baseUrl ?? null,
      frequency: dto.frequency ?? null,
      active: dto.active ?? true,
    });

    const saved = await this.sourceRepository.save(source);
    await this.auditService.log({
      userId: actorId,
      action: 'CREATE_SOURCE',
      entity: 'sources',
      entityId: saved.id,
      afterValue: this.auditSnapshot(saved),
    });
    return saved;
  }

  findAll() {
    return this.sourceRepository.find({
      relations: {
        connectors: true,
      },

      order: {
        id: 'DESC',
      },
    });
  }

  async findOne(id: number) {
    const source = await this.sourceRepository.findOne({
      where: { id },

      relations: {
        connectors: true,
      },
    });

    if (!source) {
      throw new NotFoundException('Source introuvable');
    }

    return source;
  }

  async update(id: number, dto: UpdateSourceDto, actorId?: number) {
    const source = await this.findOne(id);
    const beforeValue = this.auditSnapshot(source);

    Object.assign(source, dto);

    const saved = await this.sourceRepository.save(source);
    await this.auditService.log({
      userId: actorId,
      action: 'UPDATE_SOURCE',
      entity: 'sources',
      entityId: saved.id,
      beforeValue,
      afterValue: this.auditSnapshot(saved),
    });
    return saved;
  }

  async setActive(id: number, active: boolean, actorId?: number) {
    const source = await this.findOne(id);
    const beforeValue = { active: source.active };

    source.active = active;

    const saved = await this.sourceRepository.save(source);
    await this.auditService.log({
      userId: actorId,
      action: active ? 'ACTIVATE_SOURCE' : 'DEACTIVATE_SOURCE',
      entity: 'sources',
      entityId: saved.id,
      beforeValue,
      afterValue: { active: saved.active },
    });
    return saved;
  }

  private auditSnapshot(source: Source) {
    return {
      name: source.name,
      organization: source.organization,
      country: source.country,
      category: source.category,
      sourceType: source.sourceType,
      baseUrl: source.baseUrl,
      frequency: source.frequency,
      active: source.active,
    };
  }
}
