import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';

import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UpdateUserRolesDto } from './dto/update-user-roles.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('api/v1/users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('assignable')
  @Roles('ADMIN', 'RESPONSABLE_VEILLE', 'REFERENT_LABORATOIRE')
  findAssignable() {
    return this.usersService.findAssignable();
  }

  @Get()
  @Roles('ADMIN')
  findAll() {
    return this.usersService.findAll();
  }

  @Post()
  @Roles('ADMIN')
  create(
    @Body() dto: CreateUserDto,
    @Req() request: { user: { id: number } },
  ) {
    return this.usersService.create(dto, request.user.id);
  }

  @Patch(':id/status')
  @Roles('ADMIN')
  setStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserStatusDto,
    @Req() request: { user: { id: number } },
  ) {
    return this.usersService.setStatus(id, dto.status, request.user.id);
  }

  @Patch(':id/roles')
  @Roles('ADMIN')
  setRoles(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserRolesDto,
    @Req() request: { user: { id: number } },
  ) {
    return this.usersService.setRoles(id, dto.roles, request.user.id);
  }
}
