import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Role } from './entities/role.entity';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  findAll() {
    return this.roleRepository.find({
      relations: {
        permissions: true,
      },
    });
  }

  findByName(name: string) {
    return this.roleRepository.findOne({
      where: { name },
      relations: {
        permissions: true,
      },
    });
  }
}
