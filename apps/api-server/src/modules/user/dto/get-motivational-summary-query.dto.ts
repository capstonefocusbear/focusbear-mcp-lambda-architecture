import { IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AiToneOptions } from '@app/openai/domain/ai-tones.enum';

export class MotivationalSummaryQueryDto {
  @IsOptional()
  language: string;

  @IsOptional()
  @IsEnum(AiToneOptions)
  @ApiProperty({ enum: AiToneOptions })
  tone: AiToneOptions;
}
