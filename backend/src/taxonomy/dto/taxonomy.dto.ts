import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

const Trim = () => Transform(({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value);

export class CreateTopicDto {
  @Trim() @IsString() @MinLength(1) @MaxLength(150)
  label: string;

  @IsOptional() @IsString()
  description?: string | null;

  @IsOptional() @IsInt() @Min(1)
  parentId?: number | null;
}
export class UpdateTopicDto extends PartialType(CreateTopicDto, { skipNullProperties: false }) {}

export class CreateNamedTermDto {
  @Trim() @IsString() @MinLength(1) @MaxLength(150)
  name: string;

  @IsOptional() @IsString()
  description?: string | null;

  @ValidateIf((_, value) => value !== undefined) @IsBoolean()
  active?: boolean;
}
export class UpdateNamedTermDto extends PartialType(CreateNamedTermDto, { skipNullProperties: false }) {}

export class CreateKeywordDto {
  @Trim() @IsString() @MinLength(1) @MaxLength(150)
  label: string;

  @ValidateIf((_, value) => value !== undefined)
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(999.99)
  weight?: number;

  @ValidateIf((_, value) => value !== undefined) @IsBoolean()
  active?: boolean;
}
export class UpdateKeywordDto extends PartialType(CreateKeywordDto, { skipNullProperties: false }) {}

export class CreateSynonymDto {
  @Trim() @IsString() @MinLength(1) @MaxLength(150)
  label: string;

  @IsInt() @Min(1)
  keywordId: number;
}
export class UpdateSynonymDto extends PartialType(CreateSynonymDto, { skipNullProperties: false }) {}
