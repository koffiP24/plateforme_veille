import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';

import { TypeOrmModule } from '@nestjs/typeorm';

import { WatchItem } from '../watch-items/entities/watch-item.entity';

import { WatchItemTopic } from '../watch-items/entities/watch-item-topic.entity';

import { WatchItemKeyword } from '../watch-items/entities/watch-item-keyword.entity';

import { Topic } from '../taxonomy/entities/topic.entity';

import { Keyword } from '../taxonomy/entities/keyword.entity';

import { Domain } from '../taxonomy/entities/domain.entity';

import { Laboratory } from '../taxonomy/entities/laboratory.entity';

import { QualificationService } from './qualification.service';

import { QualificationController } from './qualification.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    TypeOrmModule.forFeature([
      WatchItem,
      WatchItemTopic,
      WatchItemKeyword,
      Topic,
      Keyword,
      Domain,
      Laboratory,
    ]),
    AuditModule,
  ],

  providers: [QualificationService],

  controllers: [QualificationController],
})
export class QualificationModule {}
