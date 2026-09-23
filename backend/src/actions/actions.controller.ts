import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { ActionsService } from './actions.service';
import { CreateActionDto } from './dto/create-action.dto';
import { UpdateActionDto } from './dto/update-action.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

interface AuthRequest extends Request {
  user: { id: number; email: string; roles: string[] };
}

@Controller('api/v1')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ActionsController {
  constructor(private readonly service: ActionsService) {}
  @Post('watch-items/:id/actions')
  @Roles('ADMIN', 'RESPONSABLE_VEILLE', 'REFERENT_LABORATOIRE')
  create(
    @Param('id', ParseIntPipe) itemId: number,
    @Body() dto: CreateActionDto,
    @Req() req: AuthRequest,
  ) {
    return this.service.create(itemId, dto, req.user.id);
  }
  @Get('watch-items/:id/actions')
  @Roles('ADMIN', 'RESPONSABLE_VEILLE', 'REFERENT_LABORATOIRE')
  findByItem(
    @Param('id', ParseIntPipe) itemId: number,
    @Req() req: AuthRequest,
  ) {
    return this.service.findByItem(itemId, req.user);
  }
  @Get('actions')
  @Roles('ADMIN', 'RESPONSABLE_VEILLE', 'REFERENT_LABORATOIRE')
  findAll(@Req() req: AuthRequest) {
    return this.service.findAll(req.user);
  }
  @Get('actions/my-pending-count')
  @Roles('ADMIN', 'RESPONSABLE_VEILLE', 'REFERENT_LABORATOIRE')
  countMyPending(@Req() req: AuthRequest) {
    return this.service.countPendingForUser(req.user.id);
  }
  @Patch('actions/:id')
  @Roles('ADMIN', 'RESPONSABLE_VEILLE', 'REFERENT_LABORATOIRE')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateActionDto,
    @Req() req: AuthRequest,
  ) {
    return this.service.update(id, dto, req.user);
  }

  @Delete('actions/:id')
  @Roles('ADMIN', 'RESPONSABLE_VEILLE', 'REFERENT_LABORATOIRE')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthRequest,
  ) {
    return this.service.remove(id, req.user);
  }
}
