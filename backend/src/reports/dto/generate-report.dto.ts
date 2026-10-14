import { IsBoolean, IsDateString, IsIn, IsOptional } from 'class-validator';
export class GenerateReportDto {
  @IsIn(['WEEKLY', 'MONTHLY', 'CUSTOM']) reportType: string;
  @IsDateString() periodStart: string;
  @IsDateString() periodEnd: string;
  @IsIn(['CSV', 'XLSX', 'PDF']) format: string;
  @IsOptional() @IsBoolean() publishedOnly?: boolean;
}
