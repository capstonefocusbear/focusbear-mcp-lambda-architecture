import { IsNotEmpty, IsString } from 'class-validator';

export class CreateSurveyAnswerMetaDto {
  @IsNotEmpty()
  @IsString()
  feature: string;

  @IsNotEmpty()
  @IsString()
  device: string;

  @IsNotEmpty()
  @IsString()
  operating_system: string;

  @IsNotEmpty()
  @IsString()
  version: string;
}
