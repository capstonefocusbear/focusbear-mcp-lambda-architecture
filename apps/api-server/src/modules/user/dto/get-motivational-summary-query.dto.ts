import { IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AiToneOptions } from '@app/openai/domain/ai-tones.enum';
import { RoutineType } from '../domain/routine-type.enum';
import { DeviceType } from '../domain/device-type.enum';

export class MotivationalSummaryQueryDto {
  @IsOptional()
  language: string;

  @IsOptional()
  @IsEnum(AiToneOptions)
  @ApiProperty({ enum: AiToneOptions })
  tone: AiToneOptions;

  @IsOptional()
  @IsEnum(RoutineType)
  @ApiProperty({ enum: RoutineType })
  routine?: RoutineType;

  @IsOptional()
  @IsEnum(DeviceType)
  @ApiProperty({ enum: DeviceType })
  device_type?: DeviceType;
}
