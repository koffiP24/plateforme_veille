import { IsDateString, IsIn, IsOptional } from 'class-validator';

export class ReportPreviewDto {
  @IsDateString() periodStart: string;
  @IsDateString() periodEnd: string;
  @IsOptional() @IsIn(['true', 'false']) publishedOnly?: string;
}
