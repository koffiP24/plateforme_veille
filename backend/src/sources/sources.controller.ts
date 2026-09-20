import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { SourcesService } from './sources.service';

import { CreateSourceDto } from './dto/create-source.dto';
import { UpdateSourceDto } from './dto/update-source.dto';
import { UpdateSourceStatusDto } from './dto/update-source-status.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('api/v1/sources')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SourcesController {
  constructor(private readonly sourcesService: SourcesService) {}

  @Get()
  @Roles('ADMIN', 'RESPONSABLE_VEILLE', 'OPERATEUR_VEILLE')
  findAll() {
    return this.sourcesService.findAll();
  }

  @Get(':id')
  @Roles('ADMIN', 'RESPONSABLE_VEILLE', 'OPERATEUR_VEILLE')
  findOne(
    @Param('id', ParseIntPipe)
    id: number,
  ) {
    return this.sourcesService.findOne(id);
  }

  @Post()
  @Roles('ADMIN', 'OPERATEUR_VEILLE')
  create(
    @Body()
    dto: CreateSourceDto,
    @Req() request: { user: { id: number } },
  ) {
    return this.sourcesService.create(dto, request.user.id);
  }

  @Patch(':id')
  @Roles('ADMIN')
  update(
    @Param('id', ParseIntPipe)
    id: number,

    @Body()
    dto: UpdateSourceDto,
    @Req() request: { user: { id: number } },
  ) {
    return this.sourcesService.update(id, dto, request.user.id);
  }

  @Patch(':id/status')
  @Roles('ADMIN')
  setStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSourceStatusDto,
    @Req() request: { user: { id: number } },
  ) {
    return this.sourcesService.setActive(id, dto.active, request.user.id);
  }
}
