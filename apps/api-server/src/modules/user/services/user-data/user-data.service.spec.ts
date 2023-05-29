import { Test, TestingModule } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import { getQueueToken } from '@nestjs/bull';
import { StripeService } from '../../../../../../../libs/stripe/src';
import { Auth0ManagementService } from '../../../../../../../libs/auth0/src';
import { RevenueCatService } from '../../../../../../../libs/revenue-cat/src';
import {
  Auth0ManagementServiceMock,
  RevenueCatServiceMock,
  SentryServiceMock,
  StripeServiceMock,
  UserRepositoryMock,
} from '../../../../../test/mocks';
import { UserRepository } from '../../repositories/user.repository';
import { UserDataService } from './user-data.service';
import { QueueMock } from '../../../../../test/dummies';

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
      .compile();

    service = module.get<UserDataService>(UserDataService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
