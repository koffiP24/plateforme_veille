import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { PermissionsModule } from './permissions/permissions.module';
import { DatabaseModule } from './database/database.module';

import { User } from './users/entities/user.entity';
import { Role } from './roles/entities/role.entity';
import { Permission } from './permissions/entities/permission.entity';

import { SourcesModule } from './sources/sources.module';
import { ConnectorsModule } from './connectors/connectors.module';

import { Source } from './sources/entities/source.entity';
import { Connector } from './connectors/entities/connector.entity';

import { ScheduleModule } from '@nestjs/schedule';

import { CollectionModule } from './collection/collection.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    ScheduleModule.forRoot(),

    TypeOrmModule.forRoot({
      type: 'postgres',

      host: process.env.DB_HOST ?? 'localhost',

      port: Number(process.env.DB_PORT ?? 5432),

      username: process.env.DB_USERNAME ?? 'postgres',

      password: process.env.DB_PASSWORD,

      database: process.env.DB_NAME ?? 'veille',

      entities: [User, Role, Permission, Source, Connector],

      /*
       * Pour la semaine 3 uniquement.
       * À désactiver avant la production.
       */
      synchronize: true,
    }),

    AuthModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    DatabaseModule,
    SourcesModule,
    ConnectorsModule,
    CollectionModule,
  ],
})
export class AppModule {}
