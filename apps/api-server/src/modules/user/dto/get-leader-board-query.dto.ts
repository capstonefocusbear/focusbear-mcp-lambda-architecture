import { IsEnum, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
import { StreakTypes } from '../domain/StreakTypes.enum';

export class GetLeaderBoardQuery {
  @IsNotEmpty()
  @IsEnum(StreakTypes)
  streak_type: StreakTypes;

  @IsOptional()
  @IsNumber()
  limit?: number;
}
