import { IsDateString, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateActionDto {
  @IsOptional()
  @IsIn(['OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED'])
  status?: string;
  @IsOptional() @IsString() @MaxLength(2000) impact?: string;
  @IsOptional() @IsString() @MaxLength(2000) decision?: string;
  @IsOptional() @IsDateString() dueDate?: string;
}
