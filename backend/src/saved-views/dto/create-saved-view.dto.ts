import { IsObject, IsString, MaxLength, MinLength } from 'class-validator';
export class CreateSavedViewDto {
  @IsString() @MinLength(1) @MaxLength(150) name: string;
  @IsObject() filters: Record<string, unknown>;
}
