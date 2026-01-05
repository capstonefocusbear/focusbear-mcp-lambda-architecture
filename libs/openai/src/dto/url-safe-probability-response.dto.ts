import { IsNotEmpty, IsNumber, IsString, Max, Min, IsOptional } from 'class-validator';

export class URLSafeProbabilityResponseDto {
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  @Max(1)
  allowed_probability: number;

  @IsNotEmpty()
  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  suggested_task?: string;

  @IsOptional()
  @IsString()
  suggested_task_id?: string;
}
