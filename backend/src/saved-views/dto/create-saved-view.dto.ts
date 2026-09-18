import { IsObject, IsString, MaxLength } from 'class-validator';
export class CreateSavedViewDto {
  @IsString() @MaxLength(150) name: string;
  @IsObject() filters: Record<string, unknown>;
}
