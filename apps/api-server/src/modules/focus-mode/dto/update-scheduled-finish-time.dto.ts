import { Type } from 'class-transformer';
import { IsDate } from 'class-validator';

export class UpdateScheduledFinishDto {
  @Type(() => Date)
  @IsDate({ message: 'scheduled_finish_time should be a valid ISO string in UTC' })
  scheduled_finish_time!: Date;
}
