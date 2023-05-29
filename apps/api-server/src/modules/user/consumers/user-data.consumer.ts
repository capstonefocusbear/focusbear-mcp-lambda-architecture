import { Process, Processor } from '@nestjs/bull';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { Job } from 'bull';
import { RevenueCatService } from '../../../../../../libs/revenue-cat/src';
import { Auth0ManagementService } from '../../../../../../libs/auth0/src';
import { UserRepository } from '../repositories/user.repository';
import { R2Service } from '../../../../../../libs/r2/src/services/r2.service';
import { SendGridService } from '../../../../../../libs/send-grid/src';
import { LanguageOptions } from '../domain/language-options.enum';
import { ENGLISH_SUBJECT, FOCUS_BEAR_TEAM_EMAIL, SPANISH_SUBJECT } from '../../../shared/utils/constants';

@Processor('user-data')
export class UserPersonalDataConsumer {
  constructor(
    @InjectSentry() private readonly sentryService: SentryService,
    private readonly auth0ManagementService: Auth0ManagementService,
    private readonly revenueCatService: RevenueCatService,
    private readonly userRepository: UserRepository,
    private readonly r2Service: R2Service,
    private readonly emailService: SendGridService,
  ) {}

  @Process('get-user-personal-data')
  async readOperationJob(
    job: Job<{
      user_id: string;
      language: LanguageOptions;
    }>,
  ) {
    const {
      data: { user_id, language },
    } = job;
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Fetching all user personal data and saving it to R2 bucket',
        data: {
          user_id,
        },
      });
      const userFocusBearData = await this.userRepository.orm.findOne({
        where: { id: user_id },
        relations: ['devices', 'activities', 'activities.log_quantity_questions', 'focus_modes'],
      });
      const auth0Promise = this.auth0ManagementService.getAuth0User(userFocusBearData.auth0_id);
      const revenueCatPromise = this.revenueCatService.getOrCreateSubscriber(user_id);
      const [userAuth0Data, userRevenueCatData] = await Promise.all([auth0Promise, revenueCatPromise]);
      await this.r2Service.addObjectToBucket('user-data', user_id, {
        focus_bear_data: userFocusBearData,
        auth0_data: userAuth0Data,
        revenue_cat_data: userRevenueCatData,
      });
      const downloadLink = await this.r2Service.getPresignedUrl('user-data', `${user_id}.json`);
      const englishEmail = `Download a copy of your data recorded by Focus Bear at\n\n${downloadLink}\n\nPlease note that this link expires after 7 days.`;
      const spanishEmail = `Descargue una copia de sus datos registrados por Focus Bear en\n\n${downloadLink}\n\nTenga en cuenta que este enlace vence después de 7 días.`;
      await this.emailService.sendEmail({
        to: 'deonvisser44@gmail.com',
        from: FOCUS_BEAR_TEAM_EMAIL,
        text: language === LanguageOptions.ENGLISH ? englishEmail : spanishEmail,
        subject: language === LanguageOptions.ENGLISH ? ENGLISH_SUBJECT : SPANISH_SUBJECT,
      });
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
    }
  }
}
