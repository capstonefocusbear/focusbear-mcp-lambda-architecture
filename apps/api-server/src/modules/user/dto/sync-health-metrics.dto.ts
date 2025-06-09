import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { HealthMetricItem } from './health-metric-item.dto';

export class SyncHealthMetricsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HealthMetricItem)
  healthMetrics: HealthMetricItem[];
}
