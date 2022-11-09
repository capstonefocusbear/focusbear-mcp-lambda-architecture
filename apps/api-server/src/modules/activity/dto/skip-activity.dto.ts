import { IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class SkipActivityDto {
  @IsNotEmpty()
  @IsUUID('4')
  activity_id: string;

  @IsNotEmpty()
  @IsUUID('4')
  device_id: string;

  @IsNotEmpty()
  @IsUUID('4')
  activity_sequence_id: string;

  @IsOptional()
  @IsUUID('4')
  choice_id?: string;

  @IsOptional()
  start_time?: Date;
}
