import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';

import { ConnectorsService } from './connectors.service';

import { CreateConnectorDto } from './dto/create-connector.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('api/v1/connectors')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ConnectorsController {
  constructor(private readonly connectorsService: ConnectorsService) {}

  @Get()
  @Roles('ADMIN', 'RESPONSABLE_VEILLE')
  findAll() {
    return this.connectorsService.findAll();
  }

  @Post()
  @Roles('ADMIN')
  create(
    @Body()
    dto: CreateConnectorDto,
  ) {
    return this.connectorsService.create(dto);
  }

  @Post(':id/test')
  @Roles('ADMIN')
  test(
    @Param('id', ParseIntPipe)
    id: number,
  ) {
    return this.connectorsService.testConnection(id);
  }
}
