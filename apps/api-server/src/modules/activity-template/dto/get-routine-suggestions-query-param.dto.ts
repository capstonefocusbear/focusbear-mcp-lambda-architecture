import { IsBoolean, IsOptional } from 'class-validator';

export class GetRoutineSuggestionsQueryParamDto {
  @IsOptional()
  @IsBoolean()
  groupByGoals?: false;
}
