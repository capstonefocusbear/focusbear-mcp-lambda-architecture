import { IsNotEmpty, IsOptional, IsUUID, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class GetAdminTrackEventsQueryDto {
  @IsNotEmpty()
  @IsUUID()
  user_id: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  take?: number = 100;
}
