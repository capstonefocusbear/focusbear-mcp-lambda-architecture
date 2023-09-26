import { IsNotEmpty, IsString } from 'class-validator';

export class CreateStripeCheckoutSessionDto {
  @IsNotEmpty()
  @IsString()
  price_id: string;
}
