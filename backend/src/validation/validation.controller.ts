import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { ValidationService } from './validation.service';
import { ReviewWatchItemDto } from './dto/review-watch-item.dto';
import { WorkflowCommentDto } from './dto/workflow-comment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

interface AuthRequest extends Request {
  user: { id: number; email: string; roles: string[] };
}

@Controller('api/v1/watch-items')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ValidationController {
  constructor(private readonly service: ValidationService) {}

  @Post(':id/review')
  @Roles('ADMIN', 'RESPONSABLE_VEILLE')
  review(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReviewWatchItemDto,
    @Req() req: AuthRequest,
  ) {
    return this.service.review(id, req.user.id, dto);
  }

  @Post(':id/publish')
  @Roles('ADMIN', 'RESPONSABLE_VEILLE')
  publish(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: WorkflowCommentDto,
    @Req() req: AuthRequest,
  ) {
    return this.service.publish(id, req.user.id, dto.comment);
  }

  @Post(':id/archive')
  @Roles('ADMIN', 'RESPONSABLE_VEILLE')
  archive(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: WorkflowCommentDto,
    @Req() req: AuthRequest,
  ) {
    return this.service.archive(id, req.user.id, dto.comment);
  }

  @Get(':id/reviews')
  @Roles(
    'ADMIN',
    'RESPONSABLE_VEILLE',
    'REFERENT_LABORATOIRE',
    'OPERATEUR_VEILLE',
  )
  findReviews(@Param('id', ParseIntPipe) id: number) {
    return this.service.findReviews(id);
  }
}
