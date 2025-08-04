import { Injectable, NotFoundException } from '@nestjs/common';
import axios from 'axios';
import { SendGridService } from '@app/send-grid';
import { Auth0ManagementService } from '@app/auth0/services/auth0-management.service';
import { prettyJson, maskEmail, safeDecodeURIComponent, escapeMarkdownForCliq } from '../../../../shared/utils/helpers';
import { EMAIL_SUBJECTS, FOCUS_BEAR_EMAILS } from '../../../../shared/utils/constants';
import { UserRepository } from '../../repositories/user.repository';
import { UserFeedbackRepository } from '../../repositories/user-feedback.repository';
import { UserFeedback } from '../../entities/user-feedback.entity';
import { UserFeedbackDto } from '../../dto/user-feedback.dto';
import { DeviceRepository } from '../../../device/repositories/device.repository';
import { EventsService } from '../../../events/services/events.service';

@Injectable()
export class UserFeedbackService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly userFeedbackRepository: UserFeedbackRepository,
    private readonly auth0ManagementService: Auth0ManagementService,
    private readonly emailService: SendGridService,
    private readonly deviceRepository: DeviceRepository,
    private readonly eventsService: EventsService,
  ) {}

  async saveUserFeedback(userId: string, { rating, feedback, metadata }: UserFeedbackDto, headers: any) {
    const user = await this.userRepository.orm.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException(`User with ID: ${userId} does not exist!`);
    }
    const requestHeaders = { ...headers };
    const appPlatform = requestHeaders.platform;
    const appVersion = requestHeaders['app-version'];
    const deviceId = requestHeaders['device-id'];
    // remove user access token from logged headers
    delete requestHeaders.authorization;
    let device = null;
    if (deviceId) {
      device = await this.deviceRepository.orm.findOneBy({ id: deviceId, user_id: userId });
    }
    const combinedMetadata = {
      ...metadata,
      app: appPlatform,
      version: appVersion,
      user_id: userId,
      operating_system: device?.operating_system ?? requestHeaders.operating_system,
    };
    const decodedFeedback = safeDecodeURIComponent(feedback || '');
    const savedFeedback = new UserFeedback({
      user_id: userId,
      rating,
      feedback: decodedFeedback,
      metadata: combinedMetadata,
    });
    const auth0User = await this.auth0ManagementService.getAuth0User(user.auth0_id);
    const saveFeedbackPromise = this.userFeedbackRepository.orm.save(savedFeedback);
    const updateUserPromise = this.userRepository.update(userId, { last_date_gave_feedback: new Date() });
    const lastFiftyEvents = await this.eventsService.getLastFiftyEvents(userId);
    const lastFifteenEvents = lastFiftyEvents.slice(0, 15);
    // format the event names array to be numbered and a new line after each event name
    const eventNames = lastFifteenEvents.map((event, index) => `${index + 1}. ${event.event_type}`).join('\n');
    const operatingSystem = combinedMetadata.operating_system;
    const emailBody = `User feedback: \n\n User ID: ${userId} \n\n Rating: ${rating} \n\n Message: ${decodedFeedback} \n\n Metadata: ${prettyJson(
      combinedMetadata,
      'pretty',
    )} \n\n Headers: ${prettyJson(requestHeaders, 'pretty')} \n\n Last 50 events:\n ${prettyJson(
      lastFiftyEvents,
      'jsonarray',
      'event_type',
    )}`;

    const cliqUrl = `${process.env.ZOHO_CLIQ_BACKEND_BOT_WEBHOOK}?zapikey=${process.env.ZOHO_CLIQ_API_KEY}`;
    const escapedFeedbackForCliq = escapeMarkdownForCliq(feedback || '');
    const body = {
      channel: process.env.ZOHO_CLIQ_CUSTOMER_FEEDBACK_CHANNEL,
      message: `User feedback: \n\n Email: ${maskEmail(
        auth0User.email,
      )} \n\n Rating: ${rating} \n\n Message: ${escapedFeedbackForCliq} \n\n OS: ${operatingSystem} \n\n Event Names: \n\n ${eventNames}`,
    };

    const cliqLogPromise = axios.post(cliqUrl, body);
    const emailPromise = this.emailService.sendEmail({
      to: [FOCUS_BEAR_EMAILS.ZOHO_DESK_SUPPORT],
      from: FOCUS_BEAR_EMAILS.SUPPORT,
      replyTo: auth0User.email,
      text: emailBody,
      subject: `${EMAIL_SUBJECTS.USER_SURVEY_FEEDBACK}`,
    });
    await Promise.all([saveFeedbackPromise, updateUserPromise, cliqLogPromise, emailPromise]);
  }
}
