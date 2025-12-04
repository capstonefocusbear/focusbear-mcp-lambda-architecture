import { IsOptional, IsEnum, IsDate, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ViewAction } from '../entities/announcement-views.entity';

export class ViewAnnouncementDto {
  @IsOptional()
  @IsEnum(ViewAction)
  @ApiPropertyOptional({
    enum: ViewAction,
    description: 'Action type for the announcement view',
    example: ViewAction.VIEWED,
    default: ViewAction.VIEWED,
  })
  action?: ViewAction;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Source or context where the announcement was viewed',
    example: 'mobile_app',
  })
  source?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  @ApiPropertyOptional({
    type: Date,
    description: 'Timestamp when the announcement was viewed',
    example: '2025-12-03T10:30:00Z',
  })
  viewed_at?: Date;
}
