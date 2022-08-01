import { Injectable } from '@nestjs/common';
import { Connection } from 'typeorm';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { SubscriptionStatus } from '../domain/subscription-status.enum';
import { Subscription } from '../entities/subscription.entity';

@Injectable()
export class SubscriptionRepository extends BaseRepository<Subscription> {
  constructor(private readonly connection: Connection) {
    super(connection, Subscription);
  }

  async getActiveSubscriptionsForUser(user_id: string): Promise<Subscription[]> {
    return this.orm.find({ where: { user_id, subscription_status: SubscriptionStatus.active } });
  }
}
