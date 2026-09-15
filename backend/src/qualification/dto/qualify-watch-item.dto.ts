import {
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export class QualifyWatchItemDto {
  @IsOptional()
  @IsIn([
    'SCIENTIFIQUE',
    'REGLEMENTAIRE',
    'ACCREDITATION',
    'NORMATIF',
    'ENVIRONNEMENT',
    'AUTRE',
  ])
  watchType?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  relevance?: number;

  @IsOptional()
  @IsIn(['FAIBLE', 'MOYENNE', 'ELEVEE', 'CRITIQUE'])
  criticality?: string;

  @IsArray()
  @ArrayUnique()
  topicIds: number[];

  @IsArray()
  @ArrayUnique()
  keywordIds: number[];

  @IsArray()
  @ArrayUnique()
  domainIds: number[];

  @IsArray()
  @ArrayUnique()
  laboratoryIds: number[];
}
