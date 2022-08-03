import { Connection, EntitySubscriberInterface, EventSubscriber } from 'typeorm';
import { SubscriptionService } from '../../subscription/services/subscription/subscription.service';
import { Team } from '../entities/team.entity';

@EventSubscriber()
export class TeamSubscriber implements EntitySubscriberInterface<Team> {
  constructor(connection: Connection, private readonly subscriptionService: SubscriptionService) {
    connection.subscribers.push(this);
  }

  listenTo() {
    return Team;
  }
}
