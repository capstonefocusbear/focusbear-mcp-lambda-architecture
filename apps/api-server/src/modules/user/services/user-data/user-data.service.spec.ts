import { Test, TestingModule } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import { getQueueToken } from '@nestjs/bull';
import { RevenueCatService } from '@app/revenue-cat';
import { Auth0ManagementService } from '@app/auth0';
import { StripeService } from '@app/stripe';
import { BrevoService } from '@app/brevo/brevo.service';
import {
  Auth0ManagementServiceMock,
  BrevoServiceMock,
  RevenueCatServiceMock,
  SentryServiceMock,
  StripeServiceMock,
  UserRepositoryMock,
} from '../../../../../test/mocks';
import { UserRepository } from '../../repositories/user.repository';
import { UserDataService } from './user-data.service';
import { QueueMock, userDummy } from '../../../../../test/dummies';
import { LanguageOptions } from '../../domain/language-options.enum';

describe('UserDataService', () => {
  let service: UserDataService;

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
          provide: getQueueToken('user-data'),
          useValue: QueueMock,
        },
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
      .compile();

    service = module.get<UserDataService>(UserDataService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processAndEmailUserData', () => {
    it('positive: should enter job into queue to process and email user their data', async () => {
      await service.processAndEmailUserData(userDummy.id, LanguageOptions.ENGLISH);

      expect(QueueMock.add).toBeCalledWith('get-user-personal-data', {
        user_id: userDummy.id,
        language: LanguageOptions.ENGLISH,
      });
    });
  });
});
