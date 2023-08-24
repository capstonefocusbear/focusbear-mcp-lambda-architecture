import { IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class UserFeedbackDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2500)
  feedback?: string;

  @IsOptional()
  metadata?: any;
}
