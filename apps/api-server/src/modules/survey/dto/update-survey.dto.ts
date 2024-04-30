import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateSurveyDto {
  @IsNotEmpty()
  @IsString()
  survey_id: string;

  @IsNotEmpty()
  @IsString()
  question: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  choices?: string[];
}
