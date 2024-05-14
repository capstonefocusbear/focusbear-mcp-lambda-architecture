import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { CreateSurveyAnswerMetaDto } from './create-survey-answer-metadata.dto';

export class CreateSurveyAnswerDto {
  @IsNotEmpty()
  @IsString()
  reply: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsBoolean()
  completed?: boolean;

  @Type(() => CreateSurveyAnswerMetaDto)
  @ApiProperty({
    type: CreateSurveyAnswerMetaDto,
  })
  metadata: CreateSurveyAnswerMetaDto;
}
