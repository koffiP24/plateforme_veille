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
import { SavedViewsService } from './saved-views.service';
import { CreateSavedViewDto } from './dto/create-saved-view.dto';
interface AuthRequest extends Request {
  user: { id: number };
}
@Controller('api/v1/saved-views')
@UseGuards(JwtAuthGuard)
export class SavedViewsController {
  constructor(private service: SavedViewsService) {}
  @Get() list(@Req() r: AuthRequest) {
    return this.service.list(r.user.id);
  }
  @Post() create(@Req() r: AuthRequest, @Body() dto: CreateSavedViewDto) {
    return this.service.create(r.user.id, dto);
  }
  @Delete(':id') remove(
    @Req() r: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.remove(r.user.id, id);
  }
}
