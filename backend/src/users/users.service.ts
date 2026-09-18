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
import { AuditService } from '../audit/audit.service';


@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    private readonly auditService: AuditService,
  ) {}

  findAll() {
    return this.userRepository.find({
      order: {
        id: 'DESC',
      },
    });
  }

  findAssignable() {
    return this.userRepository.find({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
      where: {
        status: 'ACTIVE',
      },
      order: {
        firstName: 'ASC',
        lastName: 'ASC',
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

  async create(dto: CreateUserDto, actorId?: number) {
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

    const saved = await this.userRepository.save(user);
    await this.auditService.log({
      userId: actorId,
      action: 'CREATE_USER',
      entity: 'users',
      entityId: saved.id,
      afterValue: this.auditSnapshot(saved),
    });
    return saved;
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
    const beforeValue = { status: user.status };
    user.status = status;
    await this.userRepository.save(user);

    await this.auditService.log({
      userId: actorId,
      action: status === 'ACTIVE' ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
      entity: 'users',
      entityId: user.id,
      beforeValue,
      afterValue: { status: user.status },
    });

    return { id: user.id, status: user.status };
  }

  async setRoles(id: number, roleNames: string[], actorId: number) {
    if (id === actorId && !roleNames.includes('ADMIN')) {
      throw new BadRequestException(
        'Vous ne pouvez pas retirer votre propre rôle Administrateur.',
      );
    }

    const user = await this.findById(id);
    const beforeValue = {
      roles: user.roles.map((role) => role.name),
    };
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

    await this.auditService.log({
      userId: actorId,
      action: 'UPDATE_USER_ROLES',
      entity: 'users',
      entityId: user.id,
      beforeValue,
      afterValue: { roles: roles.map((role) => role.name) },
    });

    return {
      id: user.id,
      roles: roles.map((role) => ({
        id: role.id,
        name: role.name,
        description: role.description,
      })),
    };
  }

  private auditSnapshot(user: User) {
    return {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      status: user.status,
      roles: user.roles?.map((role) => role.name) ?? [],
    };
  }
}
