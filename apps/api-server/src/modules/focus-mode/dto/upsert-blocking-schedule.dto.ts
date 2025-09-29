import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, IsEnum, IsBoolean, IsArray, IsOptional, IsNotEmpty } from 'class-validator';
import { PauseFriction, BlockLevel } from '../entities/blocking-schedule.entity';

export class UpsertBlockingScheduleDto {
  @IsOptional()
  @IsUUID()
  @ApiProperty({ required: false })
  id?: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty()
  name: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty()
  start_time: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty()
  end_time: string;

  @IsArray()
  @IsOptional()
  @ApiProperty({ required: false })
  days_of_week?: number[];

  @IsNotEmpty()
  @IsUUID()
  @ApiProperty()
  focus_mode_id: string;

  @IsEnum(PauseFriction)
  @IsOptional()
  @ApiProperty({ enum: PauseFriction, required: false })
  pause_friction?: PauseFriction;

  @IsEnum(BlockLevel)
  @IsOptional()
  @ApiProperty({ enum: BlockLevel, required: false })
  block_level?: BlockLevel;

  @IsBoolean()
  @IsOptional()
  @ApiProperty({ required: false })
  is_ai_blocking_enabled?: boolean;
}
