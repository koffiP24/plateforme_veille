import { Injectable, NotFoundException } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Source } from './entities/source.entity';
import { CreateSourceDto } from './dto/create-source.dto';
import { UpdateSourceDto } from './dto/update-source.dto';

@Injectable()
export class SourcesService {
  constructor(
    @InjectRepository(Source)
    private readonly sourceRepository: Repository<Source>,
  ) {}

  async create(dto: CreateSourceDto) {
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

    return this.sourceRepository.save(source);
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

  async update(id: number, dto: UpdateSourceDto) {
    const source = await this.findOne(id);

    Object.assign(source, dto);

    return this.sourceRepository.save(source);
  }

  async setActive(id: number, active: boolean) {
    const source = await this.findOne(id);

    source.active = active;

    return this.sourceRepository.save(source);
  }

  disable(id: number) {
    return this.setActive(id, false);
  }
}
