import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsMilitaryTime,
  IsNotEmpty,
  IsOptional,
  IsString,
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
import { LogQuantityQuestion } from '../entities/log-quantity-questions';
import { ImpactCategory } from '../domain/impact-category.enum';
import { CustomRoutine } from '../../user/entities/custom-routine';

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

function IsSubsetOfCustomRoutineDays(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'IsSubsetOfCustomRoutineDays',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const customRoutine = args.object as CustomRoutine;
          if (customRoutine?.days_of_week?.length) {
            const parentDaysOfWeek = customRoutine.days_of_week;
            return parentDaysOfWeek.includes(DaysOfWeek.ALL)
              ? true
              : value.every((day: string) => parentDaysOfWeek.includes(day as DaysOfWeek));
          }
          return true;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a subset of the parent CustomRoutine's days_of_week.`;
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

  @IsOptional()
  @IsInt()
  @ApiProperty()
  duration_seconds?: number;

  @IsOptional()
  @IsString()
  @ApiProperty()
  completion_requirements?: string;

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
  @IsSubsetOfCustomRoutineDays({ message: 'days_of_week must be a subset of the CustomRoutine days_of_week.' })
  days_of_week?: DaysOfWeek[];

  @IsArray()
  @IsOptional()
  log_quantity_questions?: LogQuantityQuestion[];

  @IsOptional()
  @IsUUID('4')
  linked_activity_id?: string;

  @IsOptional()
  @IsUUID('4')
  linked_activity_template_id?: string;

  @IsArray()
  @IsOptional()
  check_list?: string[];

  @IsOptional()
  activity_type?: string;

  @IsOptional()
  @IsEnum(ImpactCategory)
  @ApiProperty({ enum: ImpactCategory })
  impact_category?: ImpactCategory;

  @IsOptional()
  @IsUUID('4')
  tutorial?: string;

  @IsOptional()
  @IsString()
  @IsMilitaryTime()
  cutoff_time_for_doing_activity?: string;
}
