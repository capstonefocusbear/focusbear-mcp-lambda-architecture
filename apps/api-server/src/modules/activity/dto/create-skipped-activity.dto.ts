import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';
import { CompletedActivityMetadata } from '../domain/completed-activity.metadata';

export class CreateSkippedActivityDto {
  @IsNotEmpty()
  @IsUUID('4')
  activity_id: string;

  @IsOptional()
  @IsUUID('4')
  choice_id?: string;

  @IsOptional()
  @IsNumber()
  quantity_logged?: number;

  @IsOptional()
  @IsNumber()
  duration_logged?: number;

  @IsOptional()
  @IsString()
  note_logged?: string;

  @IsNotEmpty()
  @IsUUID('4')
  device_id: string;

  @IsNotEmpty()
  @IsUUID('4')
  activity_sequence_id: string;

  @IsOptional()
  @Type(() => Date)
  start_time?: Date;

  @IsOptional()
  @Type(() => Date)
  finish_time?: Date;

  @IsOptional()
  @Type(() => CompletedActivityMetadata)
  metadata?: CompletedActivityMetadata;
}
