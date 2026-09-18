import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { SearchService } from './search.service';
import { SearchWatchItemsDto } from './dto/search-watch-items.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface AuthRequest extends Request {
  user: { id: number; roles: string[] };
}
@Controller('api/v1/search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private readonly service: SearchService) {}
  @Get('watch-items') search(
    @Query() dto: SearchWatchItemsDto,
    @Req() req: AuthRequest,
  ) {
    return this.service.search(dto, req.user.roles, req.user.id);
  }
}
