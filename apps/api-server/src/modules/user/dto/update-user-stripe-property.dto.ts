import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UserStripePropertiesDto {
  @IsNotEmpty()
  @IsString()
  auth0_id: string;

  @IsOptional()
  @IsString()
  stripe_customer_id?: string;
}
