import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { CreateSurveyMetaDto } from './create-survey-metadata.dto';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSurveyAnswerDto {
  @IsNotEmpty()
  @IsString()
  reply: string;

  @IsOptional()
  @IsNumber()
  rating?: number;

  @IsOptional()
  @IsBoolean()
  completed?: boolean;

  @Type(() => CreateSurveyMetaDto)
  @ApiProperty({
    type: CreateSurveyMetaDto,
  })
  metadata: CreateSurveyMetaDto;
}
