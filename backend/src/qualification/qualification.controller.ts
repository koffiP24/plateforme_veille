import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';

import { QualificationService } from './qualification.service';

import { QualifyWatchItemDto } from './dto/qualify-watch-item.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { RolesGuard } from '../auth/guards/roles.guard';

import { Roles } from '../auth/decorators/roles.decorator';

@Controller('api/v1/watch-items')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QualificationController {
  constructor(private readonly service: QualificationService) {}

  @Get(':id/qualification')
  getQualification(
    @Param('id', ParseIntPipe)
    id: number,
  ) {
    return this.service.getQualification(id);
  }

  @Patch(':id/qualification')
  @Roles('ADMIN', 'RESPONSABLE_VEILLE', 'OPERATEUR_VEILLE')
  qualify(
    @Param('id', ParseIntPipe)
    id: number,

    @Body()
    dto: QualifyWatchItemDto,
  ) {
    return this.service.qualify(id, dto);
  }
}
