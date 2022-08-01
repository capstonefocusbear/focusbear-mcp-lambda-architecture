import { Connection, EntitySubscriberInterface, EventSubscriber } from 'typeorm';
import { SubscriptionService } from '../../subscription/services/subscription/subscription.service';
import { User } from '../entities/user.entity';

@EventSubscriber()
export class UserSubscriber implements EntitySubscriberInterface<User> {
  constructor(connection: Connection, private readonly subscriptionService: SubscriptionService) {
    connection.subscribers.push(this);
  }

  listenTo() {
    return User;
  }
}
