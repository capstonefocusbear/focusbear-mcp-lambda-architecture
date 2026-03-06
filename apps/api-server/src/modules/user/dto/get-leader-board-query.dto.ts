import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, Max, Min } from 'class-validator';
import { StreakTypes } from '../domain/StreakTypes.enum';

export class GetLeaderBoardQuery {
  @IsOptional()
  @IsEnum(StreakTypes)
  @ApiPropertyOptional({ enum: StreakTypes })
  streak_type: StreakTypes;

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional()
  limit?: number;

  /** When set, only include users with last_time_stats_updated within this many days (e.g. 30 = active in last 30 days). */
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(365)
  @ApiPropertyOptional({
    description: 'Only include users active within this many days (e.g. 30)',
    minimum: 1,
    maximum: 365,
  })
  active_within_days?: number;
}
