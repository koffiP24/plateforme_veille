import { IsIn, IsInt, IsObject, IsOptional } from 'class-validator';

export class CreateConnectorDto {
  @IsIn(['API', 'RSS', 'ATOM', 'IMPORT_MANUEL'])
  connectorType: string;

  @IsInt()
  sourceId: number;

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}
