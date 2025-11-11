/* eslint-disable max-classes-per-file */
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsMilitaryTime,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  Validate,
  ValidateNested,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { UpdateActivityDto } from '../../activity/dto/update-activity.dto';
import { LanguageOptions } from '../../../shared/domain/language-options.enum';
import { UpdateCustomRoutineDto } from './update-custom-routine.dto.dto';
import { IsValidCutoffTime } from '../../../shared/decorators/is-valid-cutoff-time.decorator';

@ValidatorConstraint({ name: 'NotIdenticalTimes', async: false })
export class NotIdenticalTimesConstraint implements ValidatorConstraintInterface {
  validate(shutdownTime: string, args: ValidationArguments) {
    const object = args.object as any;
    return shutdownTime !== object.startup_time;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  defaultMessage(args: ValidationArguments) {
    return 'Shutdown time cannot be the same as startup time';
  }
}

export class UpdateUserSettingsDto {
  @IsNotEmpty()
  @IsString()
  @IsMilitaryTime()
  startup_time?: string;

  @IsNotEmpty()
  @IsString()
  @IsMilitaryTime()
  @Validate(NotIdenticalTimesConstraint)
  shutdown_time?: string;

  @IsOptional()
  @IsString()
  @IsMilitaryTime()
  sleep_time?: string;

  @IsOptional()
  @IsString()
  @IsMilitaryTime()
  @IsValidCutoffTime({
    message:
      'Invalid cutoff time. Must satisfy the condition (cutoff < startup && cutoff < shutdown) || cutoff > shutdown.',
  })
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

  @IsOptional()
  @IsIn(['en', 'es'], { message: 'Supported languages are "en" and "es" only.' })
  language?: LanguageOptions = LanguageOptions.ENGLISH;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateCustomRoutineDto)
  @ApiProperty({ isArray: true, type: UpdateCustomRoutineDto })
  custom_routines?: UpdateCustomRoutineDto[];

  @IsOptional()
  @IsBoolean()
  @ApiProperty({ required: false, type: Boolean })
  verbose_logging?: boolean;
}
