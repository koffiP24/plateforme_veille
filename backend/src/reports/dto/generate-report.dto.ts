import { IsDateString, IsIn } from 'class-validator';
export class GenerateReportDto {
  @IsIn(['WEEKLY', 'MONTHLY', 'CUSTOM']) reportType: string;
  @IsDateString() periodStart: string;
  @IsDateString() periodEnd: string;
  @IsIn(['CSV', 'XLSX', 'PDF']) format: string;
}
