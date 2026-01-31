import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUrl,
  IsArray,
  IsEnum,
  IsOptional,
  IsBoolean,
  MaxLength,
  MinLength,
  ArrayMinSize,
} from 'class-validator';
import { WebhookEventType } from '../domain/webhook-event-type.enum';
import { IsPublicWebhookUrl } from '../../../shared/decorators/is-public-webhook-url.decorator';

export class UpdateWebhookSubscriptionDto {
  @ApiPropertyOptional({
    description: 'A friendly name for the webhook subscription',
    example: 'My Zapier Webhook',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({
    description: 'The URL to send webhook events to',
    example: 'https://hooks.zapier.com/hooks/catch/123456/abcdef/',
  })
  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true, require_tld: true })
  @IsPublicWebhookUrl({ message: 'Webhook URL must be a public https URL' })
  @MaxLength(2048)
  url?: string;

  @ApiPropertyOptional({
    description: 'The event types to subscribe to',
    example: [WebhookEventType.HABIT_COMPLETED, WebhookEventType.ROUTINE_COMPLETED],
    enum: WebhookEventType,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(WebhookEventType, { each: true })
  event_types?: WebhookEventType[];

  @ApiPropertyOptional({
    description: 'Optional secret for webhook signature verification',
    example: 'my-webhook-secret',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  secret?: string;

  @ApiPropertyOptional({
    description: 'Whether the webhook subscription is active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
