import { Transform } from 'class-transformer';
import { IsOptional } from 'class-validator';

export class IntegrationLoginQuery {
  @IsOptional()
  @Transform(({ obj, key }) => {
    const value = obj[key];
    if (typeof value === 'string') {
      return obj[key] === 'true';
    }

    return value;
  })
  is_development? = false;
}
