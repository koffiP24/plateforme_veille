import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateActionDto {
  @IsOptional()
  @IsIn(['OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED'])
  status?: string;
  @IsOptional() @IsString() impact?: string;
  @IsOptional() @IsString() decision?: string;
  @IsOptional() @IsDateString() dueDate?: string;
}
