import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { Subscription } from './entities/subscription.entity';
import { User } from '../users/entities/user.entity';
import { Topic } from '../taxonomy/entities/topic.entity';
import { Source } from '../sources/entities/source.entity';
import { Keyword } from '../taxonomy/entities/keyword.entity';
import { Domain } from '../taxonomy/entities/domain.entity';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    TypeOrmModule.forFeature([
      Subscription,
      User,
      Topic,
      Source,
      Keyword,
      Domain,
    ]),
  ],
  providers: [SubscriptionsService],
  controllers: [SubscriptionsController],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
