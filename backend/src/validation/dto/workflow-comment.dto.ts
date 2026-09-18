import { IsOptional, IsString, MaxLength } from 'class-validator';

export class WorkflowCommentDto {
  @IsOptional() @IsString() @MaxLength(2000) comment?: string;
}
