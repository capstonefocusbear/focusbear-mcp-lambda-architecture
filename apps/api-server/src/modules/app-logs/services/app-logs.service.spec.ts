import { Test } from '@nestjs/testing';
import { Auth0ManagementService } from '@app/auth0';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import { R2Service } from '@app/r2';
import {
  Auth0ManagementServiceMock,
  R2ServiceMock,
  SentryServiceMock,
  UserRepositoryMock,
} from '../../../../test/mocks/index';
import { UserRepository } from '../../user/repositories/user.repository';
import { AppLogsService } from './app-logs.service';

describe('AppLogsService', () => {
  let appLogsService: AppLogsService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AppLogsService,
        R2Service,
        Auth0ManagementService,
        UserRepository,
        {
          provide: SENTRY_TOKEN,
          useValue: SentryServiceMock,
        },
      ],
    })
      .overrideProvider(Auth0ManagementService)
      .useValue(Auth0ManagementServiceMock)
      .overrideProvider(R2Service)
      .useValue(R2ServiceMock)
      .overrideProvider(UserRepository)
      .useValue(UserRepositoryMock)
      .compile();

    appLogsService = moduleRef.get<AppLogsService>(AppLogsService);
  });

  it('should be defined', () => {
    expect(appLogsService).toBeDefined();
  });
});
