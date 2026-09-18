import { IsIn, IsInt, IsOptional } from 'class-validator';
export class CreateSubscriptionDto {
  @IsIn(['TOPIC', 'SOURCE', 'KEYWORD', 'DOMAIN']) subscriptionType: string;
  @IsIn(['IN_APP', 'EMAIL']) channel: string;
  @IsOptional() @IsInt() topicId?: number;
  @IsOptional() @IsInt() sourceId?: number;
  @IsOptional() @IsInt() keywordId?: number;
  @IsOptional() @IsInt() domainId?: number;
}
