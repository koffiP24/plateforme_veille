import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class ReviewWatchItemDto {
  @IsIn(['VALIDATE', 'REJECT']) decision: string;
  @IsOptional() @IsInt() @Min(0) @Max(100) relevance?: number;
  @IsOptional()
  @IsIn(['FAIBLE', 'MOYENNE', 'ELEVEE', 'CRITIQUE'])
  criticality?: string;
  @IsOptional() @IsString() @MaxLength(2000) comment?: string;
}
