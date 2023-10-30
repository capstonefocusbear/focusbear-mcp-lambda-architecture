import { Type } from 'class-transformer';
import { IsArray, IsDate, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { CreateToDoDto } from '../../to-do/dto/create-to-do.dto';

export class StartFocusModeDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  intention?: string;

  @IsNotEmpty()
  // @IsTimestampGreaterThanNow(null, { message: 'finish_time should be greater than NOW!' })
  @Type(() => Date)
  @IsDate({ message: 'finish_time  should be a valid ISO string in UTC zone' })
  finish_time: Date;

  @IsNotEmpty()
  // @IsTimestampLesserThanNow(null, { message: 'start_time should be lesser than NOW!' })
  @Type(() => Date)
  @IsDate({ message: 'start_time  should be a valid ISO string in UTC zone' })
  start_time: Date;

  @IsOptional()
  @IsArray()
  to_dos?: CreateToDoDto[];
}
