import { Test, TestingModule } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import { getQueueToken } from '@nestjs/bull';
import { RevenueCatService } from '@app/revenue-cat';
import { Auth0ManagementService } from '@app/auth0';
import { StripeService } from '@app/stripe';
import { BrevoService } from '@app/brevo/brevo.service';
import { SendGridService } from '@app/send-grid';
import axios from 'axios';
import {
  Auth0ManagementServiceMock,
  BrevoServiceMock,
  RevenueCatServiceMock,
  SendGridServiceMock,
  SentryServiceMock,
  StripeServiceMock,
  UserRepositoryMock,
} from '../../../../../test/mocks';
import { UserRepository } from '../../repositories/user.repository';
import { UserDataService } from './user-data.service';
import { dummyRevenueCatCustomer, QueueMock, userDummy } from '../../../../../test/dummies';
import { LanguageOptions } from '../../domain/language-options.enum';
import { BullQueues, BullWorkers } from '../../../../shared/utils/constants';

// Mock axios and set the type
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('UserDataService', () => {
  let service: UserDataService;
  const MOCK_ZOHO_CLIQ_BACKEND_BOT_WEBHOOK = 'some-url?zapikey=key';

  process.env = {
    ZOHO_CLIQ_BACKEND_BOT_WEBHOOK: 'some-url',
    ZOHO_CLIQ_API_KEY: 'key',
    ZOHO_CLIQ_QUIT_UNINSTALL_CHANNEL: 'channel',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserDataService,
        UserRepository,
        Auth0ManagementService,
        StripeService,
        RevenueCatService,
        BrevoService,
        {
          provide: SENTRY_TOKEN,
          useValue: SentryServiceMock,
        },
        {
          provide: getQueueToken(BullQueues.USER_DATA),
          useValue: QueueMock,
        },
        SendGridService,
      ],
    })
      .overrideProvider(UserRepository)
      .useValue(UserRepositoryMock)
      .overrideProvider(Auth0ManagementService)
      .useValue(Auth0ManagementServiceMock)
      .overrideProvider(RevenueCatService)
      .useValue(RevenueCatServiceMock)
      .overrideProvider(StripeService)
      .useValue(StripeServiceMock)
      .overrideProvider(BrevoService)
      .useValue(BrevoServiceMock)
      .overrideProvider(SendGridService)
      .useValue(SendGridServiceMock)
      .compile();

    service = module.get<UserDataService>(UserDataService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processAndEmailUserData', () => {
    it('positive: should enter job into queue to process and email user their data', async () => {
      await service.processAndEmailUserData(userDummy.id, LanguageOptions.ENGLISH);

      expect(QueueMock.add).toBeCalledWith(BullWorkers.GET_USER_PERSONAL_DATA, {
        user_id: userDummy.id,
        language: LanguageOptions.ENGLISH,
      });
    });
  });

  describe('deleteUser', () => {
    it('positive: user should be deleted from DB and third -party services', async () => {
      const dummyEmail = 'test@mail.com';
      const dummyStripeId = 'cus_12345';
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce({ ...userDummy, stripe_customer_id: dummyStripeId });
      Auth0ManagementServiceMock.getAuth0User.mockResolvedValueOnce({ email: dummyEmail });
      RevenueCatServiceMock.getSubscriberFromRevenueCat.mockResolvedValueOnce(dummyRevenueCatCustomer);
      StripeServiceMock.subscriptions.list.mockResolvedValue({ data: [] });

      const dummyHeaders = { 'app-version': '1.0.100', platform: 'Windows' };
      await service.deleteUser(userDummy.id, { can_contact: false, message: 'some text' }, dummyHeaders);

      expect(RevenueCatServiceMock.deleteUserFromRevenueCat).toBeCalledWith(userDummy.id);
      expect(Auth0ManagementServiceMock.deleteAuth0User).toBeCalledWith(userDummy.auth0_id);
      expect(BrevoServiceMock.deleteContactFromBrevo).toBeCalledWith(dummyEmail);
      expect(UserRepositoryMock.orm.delete).toBeCalledWith({ id: userDummy.id });
      expect(StripeServiceMock.deleteStripeCustomer).toBeCalledWith(dummyStripeId);
      expect(mockedAxios.post).toBeCalledWith(MOCK_ZOHO_CLIQ_BACKEND_BOT_WEBHOOK, {
        channel: 'channel',
        message: `Account deleted for user with email: te**@mail.com and ID: ${
          userDummy.id
        } \n\n Message: some text \n\n Can contact: ${false} \n\n Platform: ${dummyHeaders.platform}`,
      });
    });
  });
});
