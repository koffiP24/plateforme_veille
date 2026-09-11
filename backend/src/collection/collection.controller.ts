import {
  Controller,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CollectionService } from './collection.service';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { RolesGuard } from '../auth/guards/roles.guard';

import { Roles } from '../auth/decorators/roles.decorator';

@Controller('api/v1/connectors')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CollectionController {
  constructor(private readonly collectionService: CollectionService) {}

  @Post(':id/run')
  @Roles('ADMIN', 'RESPONSABLE_VEILLE')
  run(
    @Param('id', ParseIntPipe)
    id: number,
  ) {
    return this.collectionService.runConnector(id);
  }
}
