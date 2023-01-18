import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsMilitaryTime, IsNotEmpty, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { UpdateActivityDto } from '../../activity/dto/update-activity.dto';

export class UpdateUserSettingsDto {
  @IsNotEmpty()
  @IsString()
  @IsMilitaryTime()
  startup_time?: string;

  @IsNotEmpty()
  @IsString()
  @IsMilitaryTime()
  shutdown_time?: string;

  @IsOptional()
  @IsString()
  @IsMilitaryTime()
  cutoff_time_for_non_high_priority_activities?: string;

  @IsNotEmpty()
  @IsInt()
  @Min(1)
  break_after_minutes?: number;

  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateActivityDto)
  @ApiProperty({ isArray: true, type: UpdateActivityDto })
  morning_activities?: UpdateActivityDto[];

  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateActivityDto)
  @ApiProperty({ isArray: true, type: UpdateActivityDto })
  evening_activities?: UpdateActivityDto[];

  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateActivityDto)
  @ApiProperty({ isArray: true, type: UpdateActivityDto })
  break_activities?: UpdateActivityDto[];
}
