import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DashboardService } from './dashboard.service';

interface AuthRequest {
  user: { id: number; roles: string[] };
}

@Controller('api/v1/dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly service: DashboardService) {}
  @Get()
  get(@Req() request: AuthRequest, @Query('days') days?: string) {
    return this.service.get(request.user, Number(days));
  }

  @Get('details')
  details(@Req() request: AuthRequest) {
    return this.service.summary(request.user.id, request.user.roles ?? []);
  }

  @Get('analytics')
  analytics(@Req() request: AuthRequest, @Query('days') days?: string) {
    return this.service.analytics(request.user, Number(days));
  }
}
