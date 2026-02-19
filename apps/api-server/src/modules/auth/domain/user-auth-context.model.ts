import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { randomUUID } from 'crypto';
import { SubscriptionStatus } from '../../subscription/domain/subscription-status.model';

export class UserAuthContext {
  @ApiProperty({ example: randomUUID() })
  @IsUUID()
  id: string;

  @ApiProperty()
  subscriptionStatus?: SubscriptionStatus;

  @ApiProperty()
  stripeCustomerId?: string;

  @ApiPropertyOptional()
  email?: string;
}
