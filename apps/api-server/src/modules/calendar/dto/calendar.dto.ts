import { IsOptional, IsString } from 'class-validator';
import { CalendarPlatforms } from '../../platform-integrations/domain/calendar-platforms.enum';

export class CalendarDto {
  @IsOptional()
  @IsString()
  platform?: CalendarPlatforms;

  @IsOptional()
  @IsString()
  platform_account?: string;

  @IsOptional()
  @IsString()
  calendar_id?: string;

  @IsOptional()
  @IsString()
  summary?: string;
}
