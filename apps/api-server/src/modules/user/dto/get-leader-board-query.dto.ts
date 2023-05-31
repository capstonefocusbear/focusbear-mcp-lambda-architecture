import { IsEnum, IsNumber, IsOptional } from 'class-validator';
import { StreakTypes } from '../domain/StreakTypes.enum';

export class GetLeaderBoardQuery {
  @IsOptional()
  @IsEnum(StreakTypes)
  streak_type: StreakTypes;

  @IsOptional()
  @IsNumber()
  limit?: number;
}
