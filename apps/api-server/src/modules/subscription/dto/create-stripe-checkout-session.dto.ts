import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateStripeCheckoutSessionDto {
  @IsNotEmpty()
  @IsString()
  price_id: string;

  @IsOptional()
  @IsBoolean()
  is_team_subscription?: boolean;
}
