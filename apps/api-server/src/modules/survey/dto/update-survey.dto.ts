import { IsArray, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateSurveyDto {
  @IsNotEmpty()
  @IsUUID()
  survey_id: string;

  @IsNotEmpty()
  @IsString()
  question: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  choices?: string[];
}
