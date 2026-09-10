import { Module } from '@nestjs/common';

import { TypeOrmModule } from '@nestjs/typeorm';

import { Connector } from '../connectors/entities/connector.entity';

import { ConnectorsModule } from '../connectors/connectors.module';

import { CollectionService } from './collection.service';

import { CollectionSchedulerService } from './collection-scheduler.service';

@Module({
  imports: [TypeOrmModule.forFeature([Connector]), ConnectorsModule],

  providers: [CollectionService, CollectionSchedulerService],

  exports: [CollectionService],
})
export class CollectionModule {}
