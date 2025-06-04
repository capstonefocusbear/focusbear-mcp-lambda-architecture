import { IsDate, IsEnum, IsString, IsNotEmpty, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { UsageType } from '../entities/usage-data.entity';

export class UsageDataDto {
  @IsString()
  @IsNotEmpty()
  sourceName: string;

  @IsEnum(UsageType)
  @IsNotEmpty()
  usageType: UsageType;

  @IsString()
  @IsNotEmpty()
  usageCategory: string;

  @IsString()
  @IsNotEmpty()
  platform: string;

  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @IsDate()
  @Type(() => Date)
  usageStartDate: Date;

  @IsDate()
  @Type(() => Date)
  usageEndDate: Date;

  @IsNumber()
  @IsNotEmpty()
  minutesUsedTotal: number;

  @IsNumber()
  @IsNotEmpty()
  minutesUsedDuringSleepWindow: number;
}
