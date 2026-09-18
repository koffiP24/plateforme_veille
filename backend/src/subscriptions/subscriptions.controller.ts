import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
interface AuthRequest extends Request {
  user: { id: number };
}
@Controller('api/v1/subscriptions')
@UseGuards(JwtAuthGuard)
export class SubscriptionsController {
  constructor(private service: SubscriptionsService) {}

  @Get('options')
  options() {
    return this.service.options();
  }

  @Get() list(@Req() r: AuthRequest) {
    return this.service.list(r.user.id);
  }
  @Post() create(@Req() r: AuthRequest, @Body() dto: CreateSubscriptionDto) {
    return this.service.create(r.user.id, dto);
  }
  @Delete(':id') remove(
    @Req() r: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.remove(r.user.id, id);
  }
}
