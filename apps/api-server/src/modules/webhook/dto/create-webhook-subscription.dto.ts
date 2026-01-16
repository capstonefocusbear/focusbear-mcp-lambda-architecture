import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUrl, IsArray, IsEnum, IsOptional, MaxLength, MinLength, ArrayMinSize } from 'class-validator';
import { WebhookEventType } from '../domain/webhook-event-type.enum';

export class CreateWebhookSubscriptionDto {
  @ApiProperty({
    description: 'A friendly name for the webhook subscription',
    example: 'My Zapier Webhook',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: 'The URL to send webhook events to',
    example: 'https://hooks.zapier.com/hooks/catch/123456/abcdef/',
  })
  @IsUrl({ require_tld: false })
  @MaxLength(2048)
  url: string;

  @ApiProperty({
    description: 'The event types to subscribe to',
    example: [WebhookEventType.HABIT_COMPLETED, WebhookEventType.ROUTINE_COMPLETED],
    enum: WebhookEventType,
    isArray: true,
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(WebhookEventType, { each: true })
  event_types: WebhookEventType[];

  @ApiPropertyOptional({
    description: 'Optional secret for webhook signature verification',
    example: 'my-webhook-secret',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  secret?: string;
}
