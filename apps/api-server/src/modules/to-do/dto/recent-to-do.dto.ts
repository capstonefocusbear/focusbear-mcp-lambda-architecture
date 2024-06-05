import { IsDateString, IsNumber, IsOptional } from 'class-validator';

export class RecentToDoDto {
  @IsOptional()
  @IsDateString()
  updated_at?: string;

  @IsOptional()
  @IsNumber()
  take?: number = 15;
}
