import { Module } from '@nestjs/common';
import { CollectionService } from './collection.service';
import { CollectionSchedulerService } from './collection-scheduler.service';

@Module({
  providers: [CollectionService, CollectionSchedulerService],
  exports: [CollectionService],
})
export class CollectionModule {}
