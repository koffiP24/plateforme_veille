import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';

import { TypeOrmModule } from '@nestjs/typeorm';

import { Connector } from '../connectors/entities/connector.entity';

import { ConnectorsModule } from '../connectors/connectors.module';

import { WatchItemsModule } from '../watch-items/watch-items.module';

import { CollectionRun } from './entities/collection-run.entity';

import { CollectionService } from './collection.service';

import { CollectionSchedulerService } from './collection-scheduler.service';

import { NormalizationService } from './normalization.service';

import { CollectionController } from './collection.controller';

import { CollectionRunsController } from './collection-runs.controller';
import { AuditModule } from '../audit/audit.module';
import { Source } from '../sources/entities/source.entity';
import { ManualImportController } from './manual-import.controller';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    TypeOrmModule.forFeature([Connector, CollectionRun, Source]),

    ConnectorsModule,

    WatchItemsModule,
    AuditModule,
  ],

  providers: [
    CollectionService,
    CollectionSchedulerService,
    NormalizationService,
  ],

  controllers: [CollectionController, CollectionRunsController, ManualImportController],

  exports: [CollectionService],
})
export class CollectionModule {}
