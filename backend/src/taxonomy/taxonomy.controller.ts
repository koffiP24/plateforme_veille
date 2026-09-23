import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TaxonomyService } from './taxonomy.service';
import { CreateTopicDto, UpdateTopicDto, CreateNamedTermDto, UpdateNamedTermDto, CreateKeywordDto, UpdateKeywordDto, CreateSynonymDto, UpdateSynonymDto } from './dto/taxonomy.dto';

interface AuthenticatedRequest extends Request {
  user: { id: number };
}

@Controller('api/v1/taxonomy')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TaxonomyController {
  constructor(private readonly service: TaxonomyService) {}

  @Get('topics')
  listTopic() { return this.service.list('topics'); }

  @Get('topics/:id')
  getTopic(@Param('id', ParseIntPipe) id: number) { return this.service.findOne('topics', id); }

  @Post('topics')
  @Roles('ADMIN')
  createTopic(@Body() dto: CreateTopicDto, @Req() req: AuthenticatedRequest) {
    return this.service.create('topics', dto, req.user.id);
  }

  @Patch('topics/:id')
  @Roles('ADMIN')
  updateTopic(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTopicDto, @Req() req: AuthenticatedRequest) {
    return this.service.update('topics', id, dto, req.user.id);
  }

  @Delete('topics/:id')
  @Roles('ADMIN')
  deleteTopic(@Param('id', ParseIntPipe) id: number, @Req() req: AuthenticatedRequest) {
    return this.service.remove('topics', id, req.user.id);
  }

  @Get('domains')
  listDomain() { return this.service.list('domains'); }

  @Get('domains/:id')
  getDomain(@Param('id', ParseIntPipe) id: number) { return this.service.findOne('domains', id); }

  @Post('domains')
  @Roles('ADMIN')
  createDomain(@Body() dto: CreateNamedTermDto, @Req() req: AuthenticatedRequest) {
    return this.service.create('domains', dto, req.user.id);
  }

  @Patch('domains/:id')
  @Roles('ADMIN')
  updateDomain(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateNamedTermDto, @Req() req: AuthenticatedRequest) {
    return this.service.update('domains', id, dto, req.user.id);
  }

  @Delete('domains/:id')
  @Roles('ADMIN')
  deleteDomain(@Param('id', ParseIntPipe) id: number, @Req() req: AuthenticatedRequest) {
    return this.service.remove('domains', id, req.user.id);
  }

  @Get('laboratories')
  listLaboratory() { return this.service.list('laboratories'); }

  @Get('laboratories/:id')
  getLaboratory(@Param('id', ParseIntPipe) id: number) { return this.service.findOne('laboratories', id); }

  @Post('laboratories')
  @Roles('ADMIN')
  createLaboratory(@Body() dto: CreateNamedTermDto, @Req() req: AuthenticatedRequest) {
    return this.service.create('laboratories', dto, req.user.id);
  }

  @Patch('laboratories/:id')
  @Roles('ADMIN')
  updateLaboratory(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateNamedTermDto, @Req() req: AuthenticatedRequest) {
    return this.service.update('laboratories', id, dto, req.user.id);
  }

  @Delete('laboratories/:id')
  @Roles('ADMIN')
  deleteLaboratory(@Param('id', ParseIntPipe) id: number, @Req() req: AuthenticatedRequest) {
    return this.service.remove('laboratories', id, req.user.id);
  }

  @Get('keywords')
  listKeyword() { return this.service.list('keywords'); }

  @Get('keywords/:id')
  getKeyword(@Param('id', ParseIntPipe) id: number) { return this.service.findOne('keywords', id); }

  @Post('keywords')
  @Roles('ADMIN')
  createKeyword(@Body() dto: CreateKeywordDto, @Req() req: AuthenticatedRequest) {
    return this.service.create('keywords', dto, req.user.id);
  }

  @Patch('keywords/:id')
  @Roles('ADMIN')
  updateKeyword(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateKeywordDto, @Req() req: AuthenticatedRequest) {
    return this.service.update('keywords', id, dto, req.user.id);
  }

  @Delete('keywords/:id')
  @Roles('ADMIN')
  deleteKeyword(@Param('id', ParseIntPipe) id: number, @Req() req: AuthenticatedRequest) {
    return this.service.remove('keywords', id, req.user.id);
  }

  @Get('synonyms')
  listKeywordSynonym() { return this.service.list('synonyms'); }

  @Get('synonyms/:id')
  getKeywordSynonym(@Param('id', ParseIntPipe) id: number) { return this.service.findOne('synonyms', id); }

  @Post('synonyms')
  @Roles('ADMIN')
  createKeywordSynonym(@Body() dto: CreateSynonymDto, @Req() req: AuthenticatedRequest) {
    return this.service.create('synonyms', dto, req.user.id);
  }

  @Patch('synonyms/:id')
  @Roles('ADMIN')
  updateKeywordSynonym(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSynonymDto, @Req() req: AuthenticatedRequest) {
    return this.service.update('synonyms', id, dto, req.user.id);
  }

  @Delete('synonyms/:id')
  @Roles('ADMIN')
  deleteKeywordSynonym(@Param('id', ParseIntPipe) id: number, @Req() req: AuthenticatedRequest) {
    return this.service.remove('synonyms', id, req.user.id);
  }

}
