import { Transform } from 'class-transformer';
import { IsOptional } from 'class-validator';

export class ZohoAuthorizeQuery {
  @IsOptional()
  code?: string;

  @IsOptional()
  location?: string;

  @IsOptional()
  // biome-ignore lint/complexity/useLiteralKeys: square brackets are intentional
  ['accounts-server']?: string;

  @IsOptional()
  @Transform(({ obj, key }) => {
    const value = obj[key];
    if (typeof value === 'string') {
      return obj[key] === 'true';
    }

    return value;
  })
  is_development?: boolean;
}
