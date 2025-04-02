import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CancelSubscriptionSessionDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(10, { message: 'Minimum feedback characters length is 10' })
  cancel_subscription_reason: string;

  @IsNotEmpty()
  @IsString()
  entitlement_id: string;
}
