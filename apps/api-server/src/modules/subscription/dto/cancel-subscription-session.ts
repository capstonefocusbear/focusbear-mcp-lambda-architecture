import { IsNotEmpty, IsString } from 'class-validator';

export class CancelSubscriptionSession {
  @IsNotEmpty()
  @IsString()
  cancel_subscription_reason: string;
}
