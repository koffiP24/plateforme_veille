import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Source } from './entities/source.entity';

import { SourcesController } from './sources.controller';
import { SourcesService } from './sources.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    TypeOrmModule.forFeature([Source]),
  ],

  controllers: [SourcesController],

  providers: [SourcesService],

  exports: [SourcesService, TypeOrmModule],
})
export class SourcesModule {}
