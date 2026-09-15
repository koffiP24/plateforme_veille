import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { Role } from '../roles/entities/role.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './entities/user.entity';


@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  findAll() {
    return this.userRepository.find({
      order: {
        id: 'DESC',
      },
    });
  }

  async findById(id: number) {
    const user = await this.userRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    return user;
  }

  async findByEmailWithPassword(email: string) {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .leftJoinAndSelect('user.roles', 'roles')
      .where('LOWER(user.email) = LOWER(:email)', { email })
      .getOne();
  }

  async create(dto: CreateUserDto) {
    const existing = await this.userRepository.findOne({
      where: {
        email: dto.email.toLowerCase(),
      },
    });

    if (existing) {
      throw new BadRequestException('Cette adresse email existe déjà');
    }

    const roles = await this.roleRepository.find({
      where: {
        name: In(dto.roles),
      },
    });

    if (roles.length !== dto.roles.length) {
      throw new BadRequestException(
        'Un ou plusieurs rôles sont invalides',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = this.userRepository.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email.toLowerCase(),
      passwordHash,
      status: 'ACTIVE',
      roles,
    });

    return this.userRepository.save(user);
  }

  async updateLastLogin(id: number) {
    await this.userRepository.update(id, {
      lastLoginAt: new Date(),
    });
  }

  async setStatus(id: number, status: 'ACTIVE' | 'INACTIVE', actorId: number) {
    if (id === actorId && status === 'INACTIVE') {
      throw new BadRequestException('Vous ne pouvez pas désactiver votre propre compte.');
    }

    const user = await this.findById(id);
    user.status = status;
    await this.userRepository.save(user);

    return { id: user.id, status: user.status };
  }

  async setRoles(id: number, roleNames: string[], actorId: number) {
    if (id === actorId && !roleNames.includes('ADMIN')) {
      throw new BadRequestException(
        'Vous ne pouvez pas retirer votre propre rôle Administrateur.',
      );
    }

    const user = await this.findById(id);
    const uniqueRoleNames = [...new Set(roleNames)];
    const roles = await this.roleRepository.find({
      where: { name: In(uniqueRoleNames) },
      order: { name: 'ASC' },
    });

    if (roles.length !== uniqueRoleNames.length) {
      throw new BadRequestException('Un ou plusieurs rôles sont invalides.');
    }

    user.roles = roles;
    await this.userRepository.save(user);

    return {
      id: user.id,
      roles: roles.map((role) => ({
        id: role.id,
        name: role.name,
        description: role.description,
      })),
    };
  }
}
