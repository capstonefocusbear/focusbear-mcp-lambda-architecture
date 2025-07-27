import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { UpdateActivityDto } from '../../../activity/dto/update-activity.dto';

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
