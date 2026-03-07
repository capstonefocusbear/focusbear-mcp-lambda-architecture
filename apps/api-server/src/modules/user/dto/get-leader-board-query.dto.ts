import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
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

  /**
   * Only include users active within this many days.
   * Defaults to 30 (last 30 days). Pass 0 to disable the filter and show all users.
   */
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(365)
  @Transform(({ value }) => {
    if (value === undefined || value === null) return 30;
    const parsed = Number(value);
    return isNaN(parsed) ? 30 : parsed;
  })
  @ApiPropertyOptional({
    description:
      'Only include users active within this many days (e.g. 30). Defaults to 30. Pass 0 to disable the filter.',
    minimum: 0,
    maximum: 365,
    default: 30,
  })
  active_within_days?: number;
}
