import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UsageDataDto } from './usage-data.dto';

export class SyncUsageDataDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UsageDataDto)
  usageData: UsageDataDto[];
}
