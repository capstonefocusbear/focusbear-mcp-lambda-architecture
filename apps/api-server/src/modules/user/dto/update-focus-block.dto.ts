import { IsOptional, IsString, IsNumber, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateFocusBlockDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(400)
  intention?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(400)
  achievements?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(400)
  distractions?: string;

  @ApiPropertyOptional({ description: 'Duration in seconds (numeric, e.g. 3600). Must be ≥ 0.' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  focus_duration_seconds?: number;
}
