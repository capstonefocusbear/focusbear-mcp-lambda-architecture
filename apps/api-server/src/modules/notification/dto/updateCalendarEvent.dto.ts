import { IsString, IsDate, IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class UpdateCalendarEventDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDate()
  event_begins?: Date;

  @IsOptional()
  @IsDate()
  event_ends?: Date;

  @IsOptional()
  @IsBoolean()
  is_dismissed?: boolean;

  @IsOptional()
  @IsString()
  dismiss_reason?: string;

  @IsOptional()
  @IsString()
  external_id?: string;

  @IsOptional()
  @IsBoolean()
  received?: boolean;
}
