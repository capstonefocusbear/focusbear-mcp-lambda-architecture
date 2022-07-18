import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
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
import { LogSummaryType } from '../domain/log-summary-type.enum';

function IsSkippedWhenHasChoices(property: string, validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const fieldValue = (args.object as any)[propertyName];
          // eslint-disable-next-line @typescript-eslint/dot-notation
          const choices = args.object?.['choices'];
          const hasChoices = choices?.length > 0;
          if (!hasChoices) return true;
          return !fieldValue;
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
  @IsSkippedWhenHasChoices(null, {
    message:
      'log_quantity value should be skipped for Activity with choices inside! Leave this field empty in this case!',
  })
  @ApiProperty()
  log_quantity?: boolean;

  @IsNotEmpty()
  @IsInt()
  @ApiProperty()
  duration_seconds: number;

  @IsEnum(LogSummaryType)
  @IsIn(Object.values(LogSummaryType))
  @IsOptional()
  @IsSkippedWhenHasChoices(null, {
    message:
      'log_summary_type value hould be skipped for Activity with choices inside! Leave this field empty in this case!',
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
}
