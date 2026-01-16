import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WebhookEventType } from '../domain/webhook-event-type.enum';

export class WebhookSubscriptionResponseDto {
  @ApiProperty({
    description: 'The unique identifier of the webhook subscription',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'A friendly name for the webhook subscription',
    example: 'My Zapier Webhook',
  })
  name: string;

  @ApiProperty({
    description: 'The URL to send webhook events to',
    example: 'https://hooks.zapier.com/hooks/catch/123456/abcdef/',
  })
  url: string;

  @ApiProperty({
    description: 'The event types subscribed to',
    example: [WebhookEventType.ACTIVITY_COMPLETED, WebhookEventType.TODO_CREATED],
    enum: WebhookEventType,
    isArray: true,
  })
  event_types: WebhookEventType[];

  @ApiProperty({
    description: 'Whether the webhook subscription is active',
    example: true,
  })
  is_active: boolean;

  @ApiPropertyOptional({
    description: 'The last time the webhook was triggered',
    example: '2024-01-15T10:30:00Z',
  })
  last_triggered_at?: string;

  @ApiProperty({
    description: 'The number of consecutive failures',
    example: 0,
  })
  failure_count: number;

  @ApiProperty({
    description: 'When the webhook subscription was created',
    example: '2024-01-01T00:00:00Z',
  })
  created_at: string;
}
