import { Controller, Get, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { HealthService } from './health.service';

@Controller('api/v1/health')
@UseGuards(JwtAuthGuard, RolesGuard)
export class HealthController {
  constructor(private readonly service: HealthService) {}

  @Get()
  @Roles('ADMIN', 'RESPONSABLE_VEILLE')
  get() {
    return this.service.get();
  }
}
