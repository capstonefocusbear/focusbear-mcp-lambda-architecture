import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

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
}
