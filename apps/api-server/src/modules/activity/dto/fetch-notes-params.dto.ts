import { IsDate, IsNumber, IsOptional, IsUUID } from 'class-validator';
import { IsTimestampGreaterThan } from './create-completed-activity.dto';

export class FetchNotesParamsDto {
  @IsOptional()
  @IsUUID()
  activity_id: string;

  @IsOptional()
  @IsDate({ message: 'from_date should be a valid ISO string in UTC zone' })
  from_date?: Date;

  @IsOptional()
  @IsDate({ message: 'to_date should be a valid ISO string in UTC zone' })
  @IsTimestampGreaterThan('from_date', { message: 'to_date should be greater than from_date' })
  to_date?: Date;

  @IsOptional()
  @IsNumber()
  page_num?: number;

  @IsOptional()
  @IsNumber()
  per_page?: number;
}
