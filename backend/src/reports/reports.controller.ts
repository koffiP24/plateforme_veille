import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { createReadStream } from 'fs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ReportsService } from './reports.service';
import { GenerateReportDto } from './dto/generate-report.dto';
interface AuthRequest extends Request {
  user: { id: number };
}
@Controller('api/v1/reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private service: ReportsService) {}
  @Post() @Roles('ADMIN', 'RESPONSABLE_VEILLE') generate(
    @Req() r: AuthRequest,
    @Body() dto: GenerateReportDto,
  ) {
    return this.service.generate(r.user.id, dto);
  }
  @Get() @Roles('ADMIN', 'RESPONSABLE_VEILLE') list() {
    return this.service.list();
  }

  @Get(':id/download')
  @Roles('ADMIN', 'RESPONSABLE_VEILLE')
  async download(@Param('id', ParseIntPipe) id: number) {
    const report = await this.service.getDownload(id);
    const contentTypes: Record<string, string> = {
      PDF: 'application/pdf',
      XLSX: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      CSV: 'text/csv; charset=utf-8',
    };

    return new StreamableFile(createReadStream(report.filePath), {
      type: contentTypes[report.format] ?? 'application/octet-stream',
    });
  }
}
