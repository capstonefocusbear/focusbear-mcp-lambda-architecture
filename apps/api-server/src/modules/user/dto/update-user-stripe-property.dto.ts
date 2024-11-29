import { IsNotEmpty, IsString } from 'class-validator';

export class UserStripePropertiesDto {
  @IsNotEmpty()
  @IsString()
  auth0_id: string;

  @IsNotEmpty()
  @IsString()
  stripe_customer_id: string;
}
