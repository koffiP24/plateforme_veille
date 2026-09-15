import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  providers: [DashboardService], controllers: [DashboardController],
})
export class DashboardModule {}
