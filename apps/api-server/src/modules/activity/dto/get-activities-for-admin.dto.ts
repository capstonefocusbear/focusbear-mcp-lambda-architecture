import { IsEnum, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ActivityType } from '../domain/activity-type.enum';

export class GetActivitiesForAdminQueryDto {
  @IsOptional()
  @IsUUID()
  user_id?: string;

  @IsOptional()
  @IsString()
  stripe_customer_id?: string;

  @IsOptional()
  @IsEnum(ActivityType)
  @ApiProperty({ enum: ActivityType })
  activity_type?: ActivityType;

  @IsOptional()
  @IsNumber()
  page_num?: number;
}
