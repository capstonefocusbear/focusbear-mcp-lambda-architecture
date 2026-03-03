import { Type, Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  registerDecorator,
  ValidateNested,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import { CompletedActivityMetadata } from '../domain/completed-activity.metadata';
import { LogQuantityAnswerDto } from './log-quantity-answers.dto';

export function IsTimestampGreaterThan(property: string, validationOptions?: ValidationOptions) {
  return (object: any, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const start_time = (args.object as any)[property];
          return value >= start_time;
        },
      },
    });
  };
}

export function transformLogQuantityAnswers({ value }) {
  if (value === '') {
    return [];
  }
  if (Array.isArray(value)) {
    return value.filter((item: any) => item !== '');
  }
  return value;
}

export function transformEmptyStringToUndefined({ value }) {
  if (value === '') {
    return undefined;
  }
  return value;
}

export class CreateCompletedActivityDto {
  @IsNotEmpty()
  @IsUUID('4')
  activity_id: string;

  @IsOptional()
  @Transform(transformEmptyStringToUndefined)
  @IsUUID('4')
  choice_id?: string;

  @IsOptional()
  @IsNumber()
  quantity_logged?: number;

  @IsNotEmpty()
  @IsNumber()
  duration_logged: number;

  @IsOptional()
  @IsString()
  note_logged?: string;

  @IsNotEmpty()
  @IsUUID()
  device_id: string;

  @IsOptional()
  @IsUUID('4')
  activity_sequence_id: string;

  @IsNotEmpty()
  @Type(() => Date)
  @IsDate({ message: 'start_time should be a valid ISO string in UTC zone' })
  start_time?: Date;

  @IsNotEmpty()
  @Type(() => Date)
  @IsDate({ message: 'finish_time should be a valid ISO string in UTC zone' })
  @IsTimestampGreaterThan('start_time', { message: 'finish_time should be greater than or equal to start_time' })
  finish_time?: Date;

  @IsOptional()
  @ValidateNested()
  @Type(() => CompletedActivityMetadata)
  metadata?: CompletedActivityMetadata;

  @IsOptional()
  @IsBoolean()
  should_not_update_current_activity?: boolean;

  @IsArray()
  @IsOptional()
  @Transform(transformLogQuantityAnswers)
  @ValidateNested({ each: true })
  @Type(() => LogQuantityAnswerDto)
  log_quantity_answers?: LogQuantityAnswerDto[];
}
