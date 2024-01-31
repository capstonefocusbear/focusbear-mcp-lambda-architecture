import { Type, Transform } from 'class-transformer';
import { IsArray, IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';
import { CompletedActivityMetadata } from '../domain/completed-activity.metadata';
import { LogQuantityAnswerDto } from './log-quantity-answers.dto';
import { transformLogQuantityAnswers } from './create-completed-activity.dto';

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
  @IsUUID()
  device_id: string;

  @IsOptional()
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

  @IsOptional()
  @IsBoolean()
  should_not_update_current_activity?: boolean;

  @IsOptional()
  @IsArray()
  @Transform(transformLogQuantityAnswers)
  log_quantity_answers?: LogQuantityAnswerDto[];
}
