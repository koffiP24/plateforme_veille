import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateActionDto {
  @IsString() @MaxLength(200) title: string;
  @IsOptional() @IsString() description?: string;
  @IsIn([
    'ANALYSE_IMPACT',
    'MISE_A_JOUR_METHODE',
    'FORMATION',
    'VERIFICATION',
    'AUTRE',
  ])
  actionType: string;
  @IsOptional() @IsString() impact?: string;
  @IsOptional() @IsDateString() dueDate?: string;
  @IsInt() ownerId: number;
}
