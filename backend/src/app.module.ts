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

import { WatchItem } from './watch-items/entities/watch-item.entity';

import { WatchVersion } from './watch-items/entities/watch-version.entity';

import { CollectionRun } from './collection/entities/collection-run.entity';

import { WatchItemsModule } from './watch-items/watch-items.module';
import { TaxonomyModule } from './taxonomy/taxonomy.module';
import { Topic } from './taxonomy/entities/topic.entity';
import { Domain } from './taxonomy/entities/domain.entity';
import { Laboratory } from './taxonomy/entities/laboratory.entity';
import { Keyword } from './taxonomy/entities/keyword.entity';
import { KeywordSynonym } from './taxonomy/entities/keyword-synonym.entity';
import { WatchItemTopic } from './watch-items/entities/watch-item-topic.entity';
import { WatchItemKeyword } from './watch-items/entities/watch-item-keyword.entity';

import { QualificationModule } from './qualification/qualification.module';
import { DashboardModule } from './dashboard/dashboard.module';

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

      entities: [
        User,
        Role,
        Permission,
        Source,
        Connector,
        WatchItem,
        WatchVersion,
        CollectionRun,
        Topic, Domain, Laboratory, Keyword, KeywordSynonym,
        WatchItemTopic, WatchItemKeyword,
      ],

      /*
       * Pour la semaine 3 uniquement.
       * À désactiver avant la production.
       */
      synchronize: false,
    }),

    AuthModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    DatabaseModule,
    SourcesModule,
    ConnectorsModule,
    CollectionModule,
    WatchItemsModule,
    TaxonomyModule,
    QualificationModule,
    DashboardModule,
  ],
})
export class AppModule {}
