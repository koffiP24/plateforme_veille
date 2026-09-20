import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import * as bcrypt from 'bcrypt';

import { Role } from '../roles/entities/role.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class DatabaseSeedService
  implements OnApplicationBootstrap
{
  private readonly logger = new Logger(DatabaseSeedService.name);

  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async onApplicationBootstrap() {
    const roles = [
      {
        name: 'ADMIN',
        description: 'Administrateur',
      },
      {
        name: 'RESPONSABLE_VEILLE',
        description:
          'Responsable veille / Qualité',
      },
      {
        name: 'REFERENT_LABORATOIRE',
        description: 'Référent laboratoire',
      },
      {
        name: 'LECTEUR',
        description: 'Lecteur',
      },
      {
        name: 'OPERATEUR_VEILLE',
        description:
          'Stagiaire / opérateur de veille',
      },
    ];

    for (const roleData of roles) {
      let role =
        await this.roleRepository.findOne({
          where: {
            name: roleData.name,
          },
        });

      if (!role) {
        role =
          this.roleRepository.create(roleData);

        await this.roleRepository.save(role);
      }
    }

    await this.createAdminIfNeeded();
  }

  private async createAdminIfNeeded() {
    const email =
      process.env.SEED_ADMIN_EMAIL;

    const password =
      process.env.SEED_ADMIN_PASSWORD;

    if (!email || !password) {
      return;
    }

    const existing =
      await this.userRepository.findOne({
        where: {
          email: email.toLowerCase(),
        },
      });

    if (existing) {
      return;
    }

    const adminRole =
      await this.roleRepository.findOneBy({
        name: 'ADMIN',
      });

    if (!adminRole) {
      return;
    }

    const passwordHash =
      await bcrypt.hash(password, 12);

    const admin =
      this.userRepository.create({
        firstName: 'Administrateur',
        lastName: 'Plateforme',
        email: email.toLowerCase(),
        passwordHash,
        status: 'ACTIVE',
        roles: [adminRole],
      });

    await this.userRepository.save(admin);

    this.logger.log(
      `Compte administrateur créé : ${email}`,
    );
  }
}
