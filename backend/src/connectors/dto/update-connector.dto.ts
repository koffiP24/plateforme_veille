import { IsObject, IsOptional } from 'class-validator';

export class UpdateConnectorDto {
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}
