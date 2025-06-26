import { IsArray, IsBoolean, IsNumber, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TrialResultDto } from './trial-result.dto';

export class SaveFlankerTestResultDto {
  @IsNumber()
  totalTrials: number;

  @IsNumber()
  missedTrials: number;

  @IsNumber()
  overallAccuracy: number;

  @IsNumber()
  congruentAccuracy: number;

  @IsNumber()
  incongruentAccuracy: number;

  @IsNumber()
  meanRtCongruent: number;

  @IsNumber()
  meanRtIncongruent: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TrialResultDto)
  trialResults: TrialResultDto[];

  @IsBoolean()
  @IsOptional()
  isEndOfStudy: boolean;
}
