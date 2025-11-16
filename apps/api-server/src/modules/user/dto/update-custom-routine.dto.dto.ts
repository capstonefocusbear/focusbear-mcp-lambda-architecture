import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsMilitaryTime,
  IsNotEmpty,
  IsOptional,
  IsString,
  registerDecorator,
  ValidateIf,
  ValidateNested,
  ValidationOptions,
  ValidationArguments,
  IsUUID,
} from 'class-validator';
import { DateTime } from 'luxon';
import { DaysOfWeek } from '../../activity/domain/days-of-week.enum';
import { UpdateActivityDto } from '../../activity/dto/update-activity.dto';
import { CustomRoutineTrigger } from '../domain/custom-routine-trigger.enum';

function IsEndTimeAfterStartTime(validationOptions?: ValidationOptions) {
  return function (object: Record<string, any>, propertyName: string) {
    registerDecorator({
      name: 'IsEndTimeAfterStartTime',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const payload = args.object as any;
          const startTime = payload.start_time;
          const endTime = value;

          if (!startTime || !endTime) {
            return true;
          }

          const start = DateTime.fromFormat(startTime, 'HH:mm');
          const end = DateTime.fromFormat(endTime, 'HH:mm');
          if (!start.isValid || !end.isValid) {
            return false;
          }
          return end > start;
        },
        defaultMessage() {
          return 'end_time must be later than start_time.';
        },
      },
    });
  };
}

export class UpdateCustomRoutineDto {
  @IsNotEmpty()
  @ApiProperty()
  id?: string;

  @IsNotEmpty()
  @ApiProperty()
  name: string;

  @IsNotEmpty()
  @ApiProperty()
  @IsEnum(CustomRoutineTrigger)
  trigger: CustomRoutineTrigger;

  @Transform(({ value, obj }) => {
    if (obj.trigger === CustomRoutineTrigger.ON_DEMAND) {
      const updatedObj = { ...obj, days_of_week: undefined };
      Object.assign(obj, updatedObj);
    }
    return value;
  })
  @ValidateIf((o) => o.trigger === CustomRoutineTrigger.ON_SCHEDULE)
  @IsNotEmpty()
  @IsArray()
  @IsEnum(DaysOfWeek, { each: true })
  @ApiProperty({ isArray: true, enum: DaysOfWeek })
  days_of_week?: DaysOfWeek[];

  @Transform(({ value, obj }) => {
    if (obj.trigger === CustomRoutineTrigger.ON_DEMAND) {
      const updatedObj = { ...obj, start_time: undefined };
      Object.assign(obj, updatedObj);
    }
    return value;
  })
  @ValidateIf((o) => o.trigger === CustomRoutineTrigger.ON_SCHEDULE)
  @IsNotEmpty()
  @IsString()
  @IsMilitaryTime()
  start_time?: string;

  @Transform(({ value, obj }) => {
    if (obj.trigger === CustomRoutineTrigger.ON_DEMAND) {
      const updatedObj = { ...obj, end_time: undefined };
      Object.assign(obj, updatedObj);
    }
    return value;
  })
  @ValidateIf((o) => o.trigger === CustomRoutineTrigger.ON_SCHEDULE)
  @IsNotEmpty()
  @IsString()
  @IsMilitaryTime()
  @IsEndTimeAfterStartTime({ message: 'end_time must be later than start_time' })
  end_time?: string;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdateActivityDto)
  @IsArray()
  @ApiProperty({ isArray: true, type: UpdateActivityDto })
  standalone_activities?: UpdateActivityDto[];

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  @IsUUID()
  activity_sequence_id?: string;
}
