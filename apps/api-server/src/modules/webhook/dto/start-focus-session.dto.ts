import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class StartFocusSessionDto {
  @ApiProperty({ description: 'Name of the focus mode to start' })
  @IsString()
  @IsNotEmpty()
  focus_mode_name: string;

  @ApiPropertyOptional({ description: 'Duration in minutes (default: 25)' })
  @IsNumber()
  @IsOptional()
  @Min(1)
  duration_minutes?: number;

  @ApiPropertyOptional({ description: 'Intention for this focus session' })
  @IsString()
  @IsOptional()
  intention?: string;
}
