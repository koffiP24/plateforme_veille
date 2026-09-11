import { Controller, Get, UseGuards } from '@nestjs/common';

import { CollectionService } from './collection.service';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { RolesGuard } from '../auth/guards/roles.guard';

import { Roles } from '../auth/decorators/roles.decorator';

@Controller('api/v1/collection-runs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CollectionRunsController {
  constructor(private readonly collectionService: CollectionService) {}

  @Get()
  @Roles('ADMIN', 'RESPONSABLE_VEILLE')
  findAll() {
    return this.collectionService.findRuns();
  }
}
