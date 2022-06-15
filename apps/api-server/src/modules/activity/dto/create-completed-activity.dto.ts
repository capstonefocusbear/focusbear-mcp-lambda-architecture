import { Type } from 'class-transformer';
import {
  IsDate,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxDate,
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

function IsTimestampGreaterThan(property: string, validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const start_time = (args.object as any)[property];
          return value > start_time;
        },
      },
    });
  };
}

export class CreateCompletedActivityDto {
  @IsNotEmpty()
  @IsUUID('4')
  activity_id: string;

  @IsOptional()
  @IsNumber()
  quantity_logged: number;

  @IsNotEmpty()
  @IsNumber()
  duration_logged: number;

  @IsOptional()
  @IsString()
  note_logged: string;

  @IsNotEmpty()
  @IsUUID('4')
  device_id: string;

  @IsNotEmpty()
  @IsUUID('4')
  activity_sequence_id: string;

  @IsNotEmpty()
  @MaxDate(new Date(Date.now()), { message: 'start_time should be lesser than now' })
  @Type(() => Date)
  @IsDate({ message: 'start_time should be a valid UTC string or unix-time number' })
  start_time?: Date;

  @IsNotEmpty()
  @MaxDate(new Date(Date.now()), { message: 'finish_time should be lesser than now' })
  @Type(() => Date)
  @IsDate({ message: 'finish_time should be a valid UTC string or unix-time number' })
  @IsTimestampGreaterThan('start_time', { message: 'finish_time should be greater than start_time' })
  finish_time?: Date;
}
