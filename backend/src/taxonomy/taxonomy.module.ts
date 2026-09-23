import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Topic } from './entities/topic.entity';
import { Domain } from './entities/domain.entity';
import { Laboratory } from './entities/laboratory.entity';
import { Keyword } from './entities/keyword.entity';
import { KeywordSynonym } from './entities/keyword-synonym.entity';
import { TaxonomyController } from './taxonomy.controller';
import { TaxonomyService } from './taxonomy.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    TypeOrmModule.forFeature([Topic, Domain, Laboratory, Keyword, KeywordSynonym]),
    AuditModule,
  ],
  controllers: [TaxonomyController],
  providers: [TaxonomyService],
  exports: [TaxonomyService],
})
export class TaxonomyModule {}
