import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SavedView } from './entities/saved-view.entity';
import { User } from '../users/entities/user.entity';
import { SavedViewsService } from './saved-views.service';
import { SavedViewsController } from './saved-views.controller';
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    TypeOrmModule.forFeature([SavedView, User]),
  ],
  providers: [SavedViewsService],
  controllers: [SavedViewsController],
})
export class SavedViewsModule {}
