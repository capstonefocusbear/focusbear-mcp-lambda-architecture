import { IsDate, IsOptional, IsUUID } from 'class-validator';

export class GetFocusStatsQueryDto {
  @IsUUID()
  @IsOptional()
  focus_mode_id?: string;

  @IsUUID()
  @IsOptional()
  tag_id?: string;

  @IsDate()
  @IsOptional()
  from_time?: Date;

  @IsDate()
  @IsOptional()
  to_time?: Date;
}
