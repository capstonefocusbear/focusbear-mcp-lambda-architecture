import { UpdateActivityDto } from '@api-server/modules/activity/dto/update-activity.dto';
import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';

export class ActivitiesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateActivityDto)
  morning_activities: UpdateActivityDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateActivityDto)
  evening_activities: UpdateActivityDto[];
}
