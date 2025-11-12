import { IsBoolean, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class GetUnlockRequestsQueryDto {
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  as_buddy?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  approved_only?: boolean;
}
