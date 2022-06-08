import { Type } from 'class-transformer';
import { IsDate, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, MaxDate } from 'class-validator';

export class CreateComplitedActivityDto {
  @IsNotEmpty()
  @IsUUID('4')
  activity_id: string;

  @IsNotEmpty()
  @IsNumber()
  quantity_logged: number;

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
  @MaxDate(new Date(Date.now()), { message: 'timestamp cannot be bigger then now' })
  @Type(() => Date)
  @IsDate({ message: 'timestamp should be a valid UTC string or unix-time number' })
  timestamp: Date;
}
