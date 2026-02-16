import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CompleteHabitDto {
  @ApiProperty({ description: 'Name of the habit to complete' })
  @IsString()
  @IsNotEmpty()
  habit_name: string;

  @ApiPropertyOptional({
    description: 'Name of the routine containing the habit (e.g., "morning", "evening", "break")',
  })
  @IsString()
  @IsOptional()
  routine_name?: string;

  @ApiPropertyOptional({ description: 'Duration in seconds (default: activity duration or 60)' })
  @IsNumber()
  @IsOptional()
  @Min(1)
  duration_seconds?: number;
}
