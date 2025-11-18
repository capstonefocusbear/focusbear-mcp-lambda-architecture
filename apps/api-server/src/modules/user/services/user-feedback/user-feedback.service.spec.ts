import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import axios from 'axios';
import { Auth0ManagementService } from '@app/auth0';
import { SendGridService } from '@app/send-grid';
import { EMAIL_SUBJECTS, FOCUS_BEAR_EMAILS } from '../../../../shared/utils/constants';
import { DeviceDummy, auth0UserDummy, userDummy } from '../../../../../test/dummies';
import {
  UserRepositoryMock,
  SentryServiceMock,
  UserFeedbackRepositoryMock,
  Auth0ManagementServiceMock,
  SendGridServiceMock,
  DeviceRepositoryMock,
  EventsServiceMock,
} from '../../../../../test/mocks';
import { UserRepository } from '../../repositories/user.repository';
import { UserFeedbackService } from './user-feedback.service';
import { UserFeedbackRepository } from '../../repositories/user-feedback.repository';
import { UserFeedback } from '../../entities/user-feedback.entity';
import { DeviceRepository } from '../../../device/repositories/device.repository';
import { EventsService } from '../../../events/services/events.service';

// Mock axios and set the type
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('UserFeedbackService', () => {
  let service: UserFeedbackService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserFeedbackService,
        UserFeedbackRepository,
        UserRepository,
        Auth0ManagementService,
        SendGridService,
        DeviceRepository,
        EventsService,
        {
          provide: SENTRY_TOKEN,
          useValue: SentryServiceMock,
        },
      ],
    })
      .overrideProvider(UserRepository)
      .useValue(UserRepositoryMock)
      .overrideProvider(UserFeedbackRepository)
      .useValue(UserFeedbackRepositoryMock)
      .overrideProvider(Auth0ManagementService)
      .useValue(Auth0ManagementServiceMock)
      .overrideProvider(SendGridService)
      .useValue(SendGridServiceMock)
      .overrideProvider(DeviceRepository)
      .useValue(DeviceRepositoryMock)
      .overrideProvider(EventsService)
      .useValue(EventsServiceMock)
      .compile();

    service = module.get<UserFeedbackService>(UserFeedbackService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('saveUserFeedback', () => {
    const userFeedbackDummy = {
      rating: 5,
      feedback: 'Just a test!',
    };
    const dummyHeaders = { 'app-version': '1.0.100', platform: 'Windows', 'device-id': DeviceDummy.id };

    it('negative: should throw not found error if user ot returned from DB', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(null);
      let exception: any;
      const errorMessage = `User with ID: ${userDummy.id} does not exist!`;

      try {
        await service.saveUserFeedback(userDummy.id, userFeedbackDummy, dummyHeaders);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: should save user feedback in DB and update user', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      Auth0ManagementServiceMock.getAuth0User.mockResolvedValueOnce(auth0UserDummy);
      DeviceRepositoryMock.orm.findOneBy.mockResolvedValueOnce(DeviceDummy);
      EventsServiceMock.getLastFiftyEvents.mockResolvedValueOnce([]);

      await service.saveUserFeedback(userDummy.id, userFeedbackDummy, dummyHeaders);

      expect(UserFeedbackRepositoryMock.orm.save).toHaveBeenCalledWith(
        new UserFeedback({
          user_id: userDummy.id,
          feedback: userFeedbackDummy.feedback,
          rating: userFeedbackDummy.rating,
          metadata: {
            app: dummyHeaders.platform,
            version: dummyHeaders['app-version'],
            user_id: userDummy.id,
            operating_system: DeviceDummy.operating_system,
          },
        }),
      );
      expect(UserRepositoryMock.update).toHaveBeenCalledWith(userDummy.id, {
        last_date_gave_feedback: expect.toBeDate(),
      });
      expect(mockedAxios.post).toHaveBeenCalled();
      expect(SendGridServiceMock.sendEmail).toHaveBeenCalledWith({
        to: [FOCUS_BEAR_EMAILS.ZOHO_DESK_SUPPORT],
        from: FOCUS_BEAR_EMAILS.SUPPORT,
        replyTo: auth0UserDummy.email,
        text: expect.toBeString(),
        subject: `${EMAIL_SUBJECTS.USER_SURVEY_FEEDBACK}`,
      });
    });
  });
});
