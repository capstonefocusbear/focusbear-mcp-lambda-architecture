import { Transform } from 'class-transformer';
import { IsOptional, IsUUID } from 'class-validator';

export class GetMultiplePacksQueryDto {
  @IsOptional()
  @Transform(({ obj, key }) => {
    const value = obj[key];
    if (typeof value === 'string') {
      return obj[key] === 'true';
    }

    return value;
  })
  public marketplace_approval_status?: boolean;

  @IsOptional()
  @Transform(({ obj, key }) => {
    const value = obj[key];
    if (typeof value === 'string') {
      return obj[key] === 'true';
    }

    return value;
  })
  public is_featured?: boolean;

  @IsOptional()
  @Transform(({ obj, key }) => {
    const value = obj[key];
    if (typeof value === 'string') {
      return obj[key] === 'true';
    }

    return value;
  })
  featured_for_onboarding?: boolean;

  @IsOptional()
  pack_type?: string;

  @IsOptional()
  language?: string;

  @IsOptional()
  @IsUUID('4')
  user_id?: string;
}
