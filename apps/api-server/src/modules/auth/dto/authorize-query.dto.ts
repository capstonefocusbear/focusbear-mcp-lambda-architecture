import { Transform } from 'class-transformer';
import { IsOptional } from 'class-validator';

export class AuthorizeQuery {
  @IsOptional()
  code?: string;

  @IsOptional()
  location?: string;

  @IsOptional()
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
