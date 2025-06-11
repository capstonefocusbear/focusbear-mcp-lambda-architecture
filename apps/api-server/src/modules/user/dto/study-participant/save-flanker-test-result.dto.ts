import { IsArray, IsNumber, ValidateNested } from 'class-validator';
import { TrialResult } from '../../entities/flanker-test.entity';

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
  trialResults: TrialResult[];
}
