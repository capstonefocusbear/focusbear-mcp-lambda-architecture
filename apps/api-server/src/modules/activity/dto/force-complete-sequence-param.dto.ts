import { Transform } from 'class-transformer';
import { IsOptional } from 'class-validator';

export class ForceCompleteActivitySequenceQueryDto {
  @IsOptional()
  @Transform(({ obj, key }) => {
    const value = obj[key];
    if (typeof value === 'string') {
      return obj[key] === 'true';
    }

    return value;
  })
  public cancel_habits_for_today?: boolean;
}
