import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsOptional } from 'class-validator';
import { IsTimestampGreaterThan } from './create-completed-activity.dto';

export class GetCompletedActivityLogsQueryDto {
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'from_time should be a valid ISO string in UTC zone' })
  @ApiProperty({ description: 'If no value provided the default is Date.now() - 24h' })
  from_time?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'to_time should be a valid ISO string in UTC zone' })
  @IsTimestampGreaterThan('from_time', { message: 'to_time should be greater than from_time' })
  @ApiProperty({ description: 'If no value provided the default is Date.now()' })
  to_time?: Date;
}
