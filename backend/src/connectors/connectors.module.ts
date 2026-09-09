import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Connector } from './entities/connector.entity';

import { Source } from '../sources/entities/source.entity';

import { ConnectorsController } from './connectors.controller';

import { ConnectorsService } from './connectors.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    TypeOrmModule.forFeature([Connector, Source]),
  ],

  controllers: [ConnectorsController],

  providers: [ConnectorsService],

  exports: [ConnectorsService],
})
export class ConnectorsModule {}
