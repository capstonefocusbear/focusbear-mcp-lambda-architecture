import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateStripeCheckoutSessionDto {
  @IsNotEmpty()
  @IsString()
  price_id: string;

  @IsOptional()
  @IsString()
  team_id?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  team_size?: number;

  @IsOptional()
  @IsString()
  team_name?: string;
}
