import { Transform } from 'class-transformer';
import { IsOptional } from 'class-validator';

export class DeleteUserQueryParamDto {
  @IsOptional()
  message?: string;

  @IsOptional()
  @Transform(({ obj, key }) => {
    const value = obj[key];
    if (typeof value === 'string') {
      return obj[key] === 'true';
    }

    return value;
  })
  can_contact?: boolean;
}
