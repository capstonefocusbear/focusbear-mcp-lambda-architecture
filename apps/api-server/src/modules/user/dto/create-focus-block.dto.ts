import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsDateString,
  IsUUID,
  IsNumber,
  MaxLength,
  Min,
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Cross-field validator: ensures the decorated start_time property is before the sibling finish_time. */
function IsStartBeforeFinish(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isStartBeforeFinish',
      target: (object as any).constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const obj = args.object as Record<string, unknown>;
          if (!value || !obj.finish_time) return true; // let other validators catch missing fields
          return new Date(value as string) < new Date(obj.finish_time as string);
        },
        defaultMessage() {
          return 'start_time must be earlier than finish_time';
        },
      },
    });
  };
}

export class CreateFocusBlockDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(400)
  intention?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(400)
  achievements?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(400)
  distractions?: string;

  @ApiProperty({ description: 'Duration in seconds (numeric, e.g. 3600). Must be ≥ 0.' })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  focus_duration_seconds: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsDateString()
  @IsStartBeforeFinish()
  start_time: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsDateString()
  finish_time: string;

  @ApiPropertyOptional({ description: 'Optional focus mode ID. Defaults to a special "Manual" focus mode.' })
  @IsOptional()
  @IsUUID()
  focus_mode_id?: string;
}
