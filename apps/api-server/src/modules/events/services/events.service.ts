import { InjectQueue } from '@nestjs/bull';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Queue } from 'bull';
import axios from 'axios';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { Auth0ManagementService } from '../../../../../../libs/auth0/src';
import { UserRepository } from '../../user/repositories/user.repository';
import { TrackEventDto } from '../dto/track-event.dto';
import { EventTypes } from '../domain/event-types.enum';
import { ImpactEvent } from '../entities/impact-event.entity';
import { EventsRepository } from '../repositories/events.repository';
import { EVENTS_TO_IMPACT_CATEGORIES_MAP, EVENT_TYPES_TO_ALERT_IN_SLACK } from '../../../shared/utils/constants';

@Injectable()
export class EventsService {
  constructor(
    @InjectQueue('events') private eventsQueue: Queue,
    private readonly userRepository: UserRepository,
    @InjectSentry() private readonly sentryService: SentryService,
    private readonly auth0ManagementService: Auth0ManagementService,
    private readonly eventsRepository: EventsRepository,
  ) {}

  async handleIncomingEvent(trackEventDto: TrackEventDto, user_id: string) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Adding event to track-event queue',
        data: {
          user_id,
        },
      });
      const user = await this.userRepository.orm.findOneBy({ id: user_id });
      if (!user) throw new NotFoundException(`User with ID: ${user_id} does not exist!`);
      const userAuth0Data = await this.auth0ManagementService.getAuth0User(user?.auth0_id);
      const { event_type } = trackEventDto;
      if (EVENT_TYPES_TO_ALERT_IN_SLACK.includes(event_type as EventTypes)) {
        await this.logEventInSlack(user_id, trackEventDto);
      }
      await this.eventsQueue.add('track-event', {
        user_id,
        email: userAuth0Data.email,
        trackEventDto,
      });
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
  }

  async logEventInSlack(user_id: string, event: TrackEventDto) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Logging event in Slack Alerts channel',
        data: {
          user_id,
          event,
        },
      });
      const { event_type } = event;
      let message: string;
      if (event_type === EventTypes.GIVE_ME_4HR_BREAK) {
        message = `*User disabled app for 4 hours:*\n*User ID:* ${user_id}\n*Event:*\`\`\`${JSON.stringify(
          event,
        )}\`\`\``;
      }
      if (event_type === EventTypes.APP_QUIT) {
        message = `*User quit app:*\n*User ID:* ${user_id}\n*Event:*\`\`\`${JSON.stringify(event)}\`\`\``;
      }
      await axios.post(process.env.SLACK_WEBHOOKS_CHANNEL, {
        text: message,
      });
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
  }

  async saveImpactEvent(eventType: EventTypes, userId: string, quantity = 0) {
    const impactCategory = EVENTS_TO_IMPACT_CATEGORIES_MAP[eventType];
    const impactEvent = new ImpactEvent({ user_id: userId, impact_category: impactCategory, quantity });
    await this.eventsRepository.orm.save(impactEvent);
  }
}
