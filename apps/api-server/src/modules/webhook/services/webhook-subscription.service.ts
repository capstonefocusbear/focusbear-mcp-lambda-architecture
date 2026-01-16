import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectSentry, SentryService } from '@app/observability';
import { WebhookSubscriptionRepository } from '../repositories/webhook-subscription.repository';
import { WebhookSubscription } from '../entities/webhook-subscription.entity';
import { CreateWebhookSubscriptionDto } from '../dto/create-webhook-subscription.dto';
import { UpdateWebhookSubscriptionDto } from '../dto/update-webhook-subscription.dto';
import { WebhookSubscriptionResponseDto } from '../dto/webhook-subscription-response.dto';
import { WebhookEventType } from '../domain/webhook-event-type.enum';

@Injectable()
export class WebhookSubscriptionService {
  constructor(
    private readonly webhookSubscriptionRepository: WebhookSubscriptionRepository,
    @InjectSentry() private readonly sentryService: SentryService,
  ) {}

  async createSubscription(
    userId: string,
    createDto: CreateWebhookSubscriptionDto,
  ): Promise<WebhookSubscriptionResponseDto> {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Creating webhook subscription',
      data: { userId, name: createDto.name, eventTypes: createDto.event_types },
    });

    const subscription = new WebhookSubscription({
      user_id: userId,
      name: createDto.name,
      url: createDto.url,
      event_types: createDto.event_types,
      secret: createDto.secret,
      is_active: true,
      failure_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const saved = await this.webhookSubscriptionRepository.orm.save(subscription);

    return this.toResponseDto(saved);
  }

  async getSubscriptions(userId: string): Promise<WebhookSubscriptionResponseDto[]> {
    const subscriptions = await this.webhookSubscriptionRepository.findByUserId(userId);
    return subscriptions.map((sub) => this.toResponseDto(sub));
  }

  async getSubscription(userId: string, subscriptionId: string): Promise<WebhookSubscriptionResponseDto> {
    const subscription = await this.webhookSubscriptionRepository.orm.findOne({
      where: { id: subscriptionId, user_id: userId },
    });

    if (!subscription) {
      throw new NotFoundException(`Webhook subscription with ID ${subscriptionId} not found`);
    }

    return this.toResponseDto(subscription);
  }

  async updateSubscription(
    userId: string,
    subscriptionId: string,
    updateDto: UpdateWebhookSubscriptionDto,
  ): Promise<WebhookSubscriptionResponseDto> {
    const subscription = await this.webhookSubscriptionRepository.orm.findOne({
      where: { id: subscriptionId, user_id: userId },
    });

    if (!subscription) {
      throw new NotFoundException(`Webhook subscription with ID ${subscriptionId} not found`);
    }

    const updated = await this.webhookSubscriptionRepository.orm.save({
      ...subscription,
      ...updateDto,
      updated_at: new Date().toISOString(),
    });

    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'info',
      message: 'Webhook subscription updated',
      data: { userId, subscriptionId },
    });

    return this.toResponseDto(updated);
  }

  async deleteSubscription(userId: string, subscriptionId: string): Promise<void> {
    const subscription = await this.webhookSubscriptionRepository.orm.findOne({
      where: { id: subscriptionId, user_id: userId },
    });

    if (!subscription) {
      throw new NotFoundException(`Webhook subscription with ID ${subscriptionId} not found`);
    }

    await this.webhookSubscriptionRepository.orm.delete(subscriptionId);

    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'info',
      message: 'Webhook subscription deleted',
      data: { userId, subscriptionId },
    });
  }

  async getSubscriptionsByEventType(userId: string, eventType: WebhookEventType): Promise<WebhookSubscription[]> {
    return this.webhookSubscriptionRepository.findByEventType(userId, eventType);
  }

  private toResponseDto(subscription: WebhookSubscription): WebhookSubscriptionResponseDto {
    return {
      id: subscription.id,
      name: subscription.name,
      url: subscription.url,
      event_types: subscription.event_types,
      is_active: subscription.is_active,
      last_triggered_at: subscription.last_triggered_at?.toISOString(),
      failure_count: subscription.failure_count,
      created_at: subscription.created_at,
    };
  }
}
