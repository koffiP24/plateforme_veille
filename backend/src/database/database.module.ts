import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from '../users/entities/user.entity';
import { Role } from '../roles/entities/role.entity';

import { DatabaseSeedService } from './database-seed.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Role,
    ]),
  ],

  providers: [DatabaseSeedService],
})
export class DatabaseModule {}
