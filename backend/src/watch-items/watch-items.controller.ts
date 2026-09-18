import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Req,
  UseGuards,
} from '@nestjs/common';

import { WatchItemsService } from './watch-items.service';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { RolesGuard } from '../auth/guards/roles.guard';

import { Roles } from '../auth/decorators/roles.decorator';

@Controller('api/v1/watch-items')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WatchItemsController {
  constructor(private readonly watchItemsService: WatchItemsService) {}

  @Get()
  @Roles('ADMIN', 'RESPONSABLE_VEILLE', 'OPERATEUR_VEILLE')
  findAll() {
    return this.watchItemsService.findAll();
  }

  @Get(':id')
  @Roles(
    'ADMIN',
    'RESPONSABLE_VEILLE',
    'REFERENT_LABORATOIRE',
    'OPERATEUR_VEILLE',
    'LECTEUR',
  )
  findOne(
    @Param('id', ParseIntPipe)
    id: number,
    @Req() request: { user: { roles: string[] } },
  ) {
    return this.watchItemsService.findOneForRoles(id, request.user.roles ?? []);
  }
}
