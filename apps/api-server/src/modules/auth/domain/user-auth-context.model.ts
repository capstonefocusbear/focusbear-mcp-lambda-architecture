import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { randomUUID } from 'crypto';

export class UserAuthContext {
  @ApiProperty({ example: randomUUID() })
  @IsUUID()
  id: string;

  @ApiProperty()
  subscriptionStatus: { hasActiveSubscription: boolean; entitlements: string[] };
}
