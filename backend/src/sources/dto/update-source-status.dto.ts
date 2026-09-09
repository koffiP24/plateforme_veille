import { IsBoolean, IsDefined } from 'class-validator';

export class UpdateSourceStatusDto {
  @IsDefined()
  @IsBoolean()
  active: boolean;
}
