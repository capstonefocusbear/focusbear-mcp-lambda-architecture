import { IsNotEmpty, IsNumber, IsString, Max, Min } from 'class-validator';

export class URLSafeProbabilityResponseDto {
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  @Max(1)
  allowed_probability: number;

  @IsNotEmpty()
  @IsString()
  reason: string;
}
