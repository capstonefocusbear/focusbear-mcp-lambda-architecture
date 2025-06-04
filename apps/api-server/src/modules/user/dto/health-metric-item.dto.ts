import { IsEnum, IsNumber, IsString, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import { HealthMetricType } from '../entities/health-metrics.entity';

export class HealthMetricItem {
  @IsEnum(HealthMetricType)
  metricType: HealthMetricType;

  @IsDate()
  @Type(() => Date)
  dayOfTracking: Date;

  @IsNumber()
  metricValue: number;

  @IsString()
  sourceName: string;
}
