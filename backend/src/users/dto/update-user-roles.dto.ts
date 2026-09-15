import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsString,
} from 'class-validator';

export class UpdateUserRolesDto {
  @IsArray()
  @ArrayMinSize(1, {
    message: 'Un utilisateur doit conserver au moins un rôle.',
  })
  @ArrayUnique({
    message: 'Un même rôle ne peut pas être attribué plusieurs fois.',
  })
  @IsString({ each: true })
  roles: string[];
}
