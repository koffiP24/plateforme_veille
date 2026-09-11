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

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    TypeOrmModule.forFeature([Connector, CollectionRun]),

    ConnectorsModule,

    WatchItemsModule,
  ],

  providers: [
    CollectionService,
    CollectionSchedulerService,
    NormalizationService,
  ],

  controllers: [CollectionController, CollectionRunsController],

  exports: [CollectionService],
})
export class CollectionModule {}
