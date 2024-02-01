import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional } from 'class-validator';
import { LessonCompletionStatus } from '../domain/lesson-completion-status.enum';

export class CreateLessonCompletionDto {
  @IsNotEmpty()
  course_id: string;

  @IsNotEmpty()
  lesson_id: string;

  @IsEnum(LessonCompletionStatus)
  @IsOptional()
  @ApiPropertyOptional({ enum: LessonCompletionStatus, default: LessonCompletionStatus.TUTORIAL })
  status?: LessonCompletionStatus;
}
