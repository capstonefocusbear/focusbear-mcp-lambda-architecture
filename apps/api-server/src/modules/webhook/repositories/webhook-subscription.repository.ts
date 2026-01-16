import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { WebhookSubscription } from '../entities/webhook-subscription.entity';
import { WebhookEventType } from '../domain/webhook-event-type.enum';

@Injectable()
export class WebhookSubscriptionRepository {
  public readonly orm: Repository<WebhookSubscription>;

  constructor(private readonly dataSource: DataSource) {
    this.orm = this.dataSource.getRepository(WebhookSubscription);
  }

  async findByUserId(userId: string): Promise<WebhookSubscription[]> {
    return this.orm.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
    });
  }

  async findActiveByUserId(userId: string): Promise<WebhookSubscription[]> {
    return this.orm.find({
      where: { user_id: userId, is_active: true },
      order: { created_at: 'DESC' },
    });
  }

  async findByEventType(userId: string, eventType: WebhookEventType): Promise<WebhookSubscription[]> {
    const subscriptions = await this.orm
      .createQueryBuilder('subscription')
      .where('subscription.user_id = :userId', { userId })
      .andWhere('subscription.is_active = true')
      .andWhere(':eventType = ANY(subscription.event_types)', { eventType })
      .getMany();

    return subscriptions;
  }

  async incrementFailureCount(subscriptionId: string): Promise<void> {
    await this.orm.increment({ id: subscriptionId }, 'failure_count', 1);
  }

  async resetFailureCount(subscriptionId: string): Promise<void> {
    await this.orm.update(subscriptionId, { failure_count: 0 });
  }

  async updateLastTriggered(subscriptionId: string): Promise<void> {
    await this.orm.update(subscriptionId, { last_triggered_at: new Date() });
  }
}
