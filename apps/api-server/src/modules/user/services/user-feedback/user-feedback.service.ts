import { Injectable, NotFoundException } from '@nestjs/common';
import axios from 'axios';
import { SendGridService } from '@app/send-grid';
import { Auth0ManagementService } from '@app/auth0/services/auth0-management.service';
import { EMAIL_SUBJECTS, FOCUS_BEAR_EMAILS } from '../../../../shared/utils/constants';
import { UserRepository } from '../../repositories/user.repository';
import { UserFeedbackRepository } from '../../repositories/user-feedback.repository';
import { UserFeedback } from '../../entities/user-feedback.entity';
import { UserFeedbackDto } from '../../dto/user-feedback.dto';
import { DeviceRepository } from '../../../device/repositories/device.repository';

@Injectable()
export class UserFeedbackService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly userFeedbackRepository: UserFeedbackRepository,
    private readonly auth0ManagementService: Auth0ManagementService,
    private readonly emailService: SendGridService,
    private readonly deviceRepository: DeviceRepository,
  ) {}

  private httpService = axios;

  async saveUserFeedback(userId: string, { rating, feedback, metadata }: UserFeedbackDto, headers: any) {
    const user = await this.userRepository.orm.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException(`User with ID: ${userId} does not exist!`);
    }
    const appPlatform = headers.platform;
    const appVersion = headers['app-version'];
    const deviceId = headers['device-id'];
    let device = null;
    if (deviceId) {
      device = await this.deviceRepository.orm.findOneBy({ id: deviceId, user_id: userId });
    }
    const combinedMetadata = {
      ...metadata,
      app: appPlatform,
      version: appVersion,
      user_id: userId,
      operating_system: device?.operating_system ?? 'undefined',
    };
    const savedFeedback = new UserFeedback({ user_id: userId, rating, feedback, metadata: combinedMetadata });
    const auth0User = await this.auth0ManagementService.getAuth0User(user.auth0_id);
    const saveFeedbackPromise = this.userFeedbackRepository.orm.save(savedFeedback);
    const updateUserPromise = this.userRepository.update(userId, { last_date_gave_feedback: new Date() });
    const messageData = `User feedback: \n\n Rating: ${rating} \n\n Message: ${feedback} \n\n Metadata: ${JSON.stringify(
      combinedMetadata,
    )}`;
    const slackLogPromise = this.httpService.post(process.env.SLACK_CUSTOMER_SUPPORT_WEBHOOK, {
      text: messageData,
    });
    const emailPromise = this.emailService.sendEmail({
      to: [FOCUS_BEAR_EMAILS.ZOHO_DESK_SUPPORT],
      from: FOCUS_BEAR_EMAILS.SUPPORT,
      replyTo: auth0User.email,
      text: JSON.stringify(messageData),
      subject: `${EMAIL_SUBJECTS.USER_SURVEY_FEEDBACK}`,
    });
    await Promise.all([saveFeedbackPromise, updateUserPromise, slackLogPromise, emailPromise]);
  }
}
