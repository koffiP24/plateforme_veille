import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
interface AuthRequest extends Request {
  user: { id: number };
}
@Controller('api/v1/notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private service: NotificationsService) {}
  @Get() list(@Req() r: AuthRequest) {
    return this.service.list(r.user.id);
  }
  @Patch('read-all') readAll(@Req() r: AuthRequest) {
    return this.service.markAllRead(r.user.id);
  }
  @Patch(':id/read') read(
    @Req() r: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.markRead(r.user.id, id);
  }
}
