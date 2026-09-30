import {
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
import { FavoritesService } from './favorites.service';
interface AuthRequest extends Request {
  user: { id: number; roles: string[] };
}
@Controller('api/v1/favorites')
@UseGuards(JwtAuthGuard)
export class FavoritesController {
  constructor(private service: FavoritesService) {}
  @Get() list(@Req() req: AuthRequest) {
    return this.service.list(req.user.id, req.user.roles);
  }
  @Post(':itemId') add(
    @Req() req: AuthRequest,
    @Param('itemId', ParseIntPipe) itemId: number,
  ) {
    return this.service.add(req.user.id, itemId, req.user.roles);
  }
  @Delete(':itemId') remove(
    @Req() req: AuthRequest,
    @Param('itemId', ParseIntPipe) itemId: number,
  ) {
    return this.service.remove(req.user.id, itemId);
  }
}
