import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Connector } from '../connectors/entities/connector.entity';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    TypeOrmModule.forFeature([Connector]),
  ],
  providers: [HealthService],
  controllers: [HealthController],
})
export class HealthModule {}
