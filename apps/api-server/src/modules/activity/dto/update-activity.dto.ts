import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  registerDecorator,
  ValidateIf,
  ValidateNested,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import { ActivityChoiceData } from '../domain/activity-choice-data.model';
import { ActivityData } from '../domain/activity-data.model';
import { DaysOfWeek } from '../domain/days-of-week.enum';
import { LogSummaryType } from '../domain/log-summary-type.enum';

function IsEqualWhenHasChoices(property: any, validationOptions?: ValidationOptions) {
  return (object: any, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(_value: any, args: ValidationArguments) {
          const fieldValue = (args.object as any)[propertyName];
          // eslint-disable-next-line @typescript-eslint/dot-notation
          const choices = args.object?.['choices'];
          const hasChoices = choices?.length > 0;
          if (!hasChoices) return true;
          if (!fieldValue) return true;
          return fieldValue === property;
        },
      },
    });
  };
}

export class UpdateActivityDto extends ActivityData {
  @IsNotEmpty()
  @IsUUID('4')
  id: string;

  @IsOptional()
  @IsBoolean()
  @IsEqualWhenHasChoices(false, {
    message: 'log_quantity value should be skipped or equal false for Activity with choices inside!',
  })
  @ApiProperty()
  log_quantity?: boolean;

  @IsNotEmpty()
  @IsInt()
  @ApiProperty()
  duration_seconds?: number;

  // @IsEnum(LogSummaryType)
  @IsIn([...Object.values(LogSummaryType), ''])
  @IsOptional()
  @IsEqualWhenHasChoices(LogSummaryType.SUM, {
    message: 'log_summary_type value should be skipped or equal SUM for Activity with choices inside!',
  })
  @ApiProperty({ enum: LogSummaryType })
  log_summary_type?: LogSummaryType;

  @IsArray()
  @IsOptional()
  @ArrayMinSize(1)
  @ValidateIf((o) => o.choices?.length > 0)
  @ValidateNested({ each: true })
  @Type(() => ActivityChoiceData)
  @ApiProperty({ isArray: true, type: ActivityChoiceData })
  choices?: ActivityChoiceData[];

  @IsUUID('4')
  @IsOptional()
  activity_template_id?: string;

  @IsOptional()
  @IsBoolean()
  is_default?: boolean;

  @IsOptional()
  @IsBoolean()
  run_micro_breaks?: boolean;

  @IsArray()
  @IsOptional()
  @ArrayMinSize(1)
  days_of_week?: DaysOfWeek[];
}
