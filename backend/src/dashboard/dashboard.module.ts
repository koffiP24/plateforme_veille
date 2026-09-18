import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { WatchItem } from '../watch-items/entities/watch-item.entity';
import { Source } from '../sources/entities/source.entity';
import { FollowUpAction } from '../actions/entities/follow-up-action.entity';
import { User } from '../users/entities/user.entity';
import { CollectionRun } from '../collection/entities/collection-run.entity';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    TypeOrmModule.forFeature([
      WatchItem,
      Source,
      FollowUpAction,
      User,
      CollectionRun,
    ]),
  ],
  providers: [DashboardService], controllers: [DashboardController],
})
export class DashboardModule {}
