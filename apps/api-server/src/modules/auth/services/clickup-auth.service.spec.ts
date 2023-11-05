import { Test } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import { ConfigService } from '@nestjs/config';
import { getQueueToken } from '@nestjs/bull';
import axios from 'axios';
import {
  PlatformIntegrationsServiceMock,
  SentryServiceMock,
  ClickupServiceMock,
  ConfigServiceMock,
} from '../../../../test/mocks';
import { UserRepositoryMock } from '../../../../test/mocks/repositories.mock';
import { UserRepository } from '../../user/repositories/user.repository';
import { ClickupAuthService } from './clickup-auth.service';
import { ClickupService } from '../../integration/services/clickup.service';
import { QueueMock, userDummy } from '../../../../test/dummies';
import { PlatformIntegrationsService } from '../../platform-integrations/services/platform-integrations.service';
import { IntegrationPlatforms } from '../../platform-integrations/domain/integration-platforms.enum';

// Mock axios and set the type
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ClickupService', () => {
  let clickupAuthService: ClickupAuthService;

  beforeEach(async () => {
    jest.resetAllMocks();
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        ConfigService,
        ClickupAuthService,
        UserRepository,
        ClickupService,
        PlatformIntegrationsService,
        {
          provide: SENTRY_TOKEN,
          useValue: SentryServiceMock,
        },
        {
          provide: getQueueToken('time-logs'),
          useValue: QueueMock,
        },
      ],
    })
      .overrideProvider(UserRepository)
      .useValue(UserRepositoryMock)
      .overrideProvider(ConfigService)
      .useValue(ConfigServiceMock)
      .overrideProvider(ClickupService)
      .useValue(ClickupServiceMock)
      .overrideProvider(PlatformIntegrationsService)
      .useValue(PlatformIntegrationsServiceMock)
      .compile();
    ConfigServiceMock.get.mockReturnValueOnce('clickup-client-id');
    clickupAuthService = moduleRef.get<ClickupAuthService>(ClickupAuthService);
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();
  });

  it('positive: should be defined', () => {
    expect(clickupAuthService).toBeDefined();
  });

  describe('authorize', () => {
    it('positive: should create platform integration record saving users clickup credentials', async () => {
      const authorizationResponseDummy = {
        access_token: 'token',
        expires_in: new Date().valueOf(),
        refresh_token: 'refresh-token',
      };
      const userResponseDummy = {
        user: {
          id: 'account-id',
        },
      };
      UserRepositoryMock.orm.findOneBy.mockResolvedValue(userDummy);
      mockedAxios.post.mockResolvedValueOnce({
        data: authorizationResponseDummy,
      });
      mockedAxios.get.mockResolvedValueOnce({
        data: userResponseDummy,
      });

      await clickupAuthService.authorize(userDummy.id, {
        code: 'code',
      });

      expect(PlatformIntegrationsServiceMock.updatePlatformIntegration).toBeCalledWith(
        userDummy.id,
        IntegrationPlatforms.CLICK_UP,
        {
          client_id: undefined,
          refresh_token: authorizationResponseDummy.refresh_token,
          access_token: authorizationResponseDummy.access_token,
          accountId: userResponseDummy.user.id,
          location: '',
          account_server: '',
        },
        userResponseDummy.user.id,
      );
    });
  });
});
