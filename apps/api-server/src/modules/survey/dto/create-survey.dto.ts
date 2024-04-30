import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AnswerType } from '../domain/answer-type.enum';

export class CreateSurveyDto {
  @IsNotEmpty()
  @IsString()
  question: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  choices?: string[];

  @IsNotEmpty()
  @IsEnum(AnswerType)
  @ApiProperty({ enum: AnswerType, default: AnswerType.TEXT })
  answer_type: AnswerType;
}
