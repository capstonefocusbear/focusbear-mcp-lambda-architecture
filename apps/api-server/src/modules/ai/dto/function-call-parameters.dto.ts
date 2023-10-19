import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { DaysOfWeek } from '../../activity/domain/days-of-week.enum';

export class FunctionCallParametersDto {
  @IsNotEmpty()
  @IsString()
  name?: string;

  @IsOptional()
  @IsArray()
  allowed_urls?: string[];

  @IsOptional()
  @IsArray()
  allowed_apps?: string[];

  @IsOptional()
  @IsArray()
  days_of_week?: DaysOfWeek[];

  @IsOptional()
  @IsString()
  routine?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  duration?: number;
}
