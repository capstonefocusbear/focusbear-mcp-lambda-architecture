import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsNotEmpty, IsString, Matches, ValidateNested } from 'class-validator';
import { constants } from '../../../config';
import { UpdateActivityDto } from '../../activity/dto/update-activity.dto';

export class UpdateUserSettingsDto {
  @IsNotEmpty()
  @IsString()
  @Matches(constants().validation.patterns['HH:MM'])
  startup_time?: string;

  @IsNotEmpty()
  @IsString()
  @Matches(constants().validation.patterns['HH:MM'])
  shutdown_time?: string;

  @IsNotEmpty()
  @IsInt()
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
