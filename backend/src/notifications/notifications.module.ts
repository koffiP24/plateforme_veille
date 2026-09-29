import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { Notification } from './entities/notification.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { WatchItem } from '../watch-items/entities/watch-item.entity';
import { NotificationsService } from './notifications.service';
import { NotificationMailService } from './notification-mail.service';
import { NotificationsController } from './notifications.controller';
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    TypeOrmModule.forFeature([Notification, Subscription, WatchItem]),
  ],
  providers: [NotificationsService, NotificationMailService],
  controllers: [NotificationsController],
  exports: [NotificationsService],
})
export class NotificationsModule {}
