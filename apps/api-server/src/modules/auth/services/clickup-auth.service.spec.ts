import { Test } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@app/observability';
import { ConfigService } from '@nestjs/config';
import { getQueueToken } from '@nestjs/bull';
import axios from 'axios';
import {
  PlatformIntegrationsServiceMock,
  SentryServiceMock,
  ClickUpServiceMock,
  ConfigServiceMock,
} from '../../../../test/mocks';
import { UserRepositoryMock } from '../../../../test/mocks/repositories.mock';
import { UserRepository } from '../../user/repositories/user.repository';
import { ClickUpAuthService } from './clickup-auth.service';
import { ClickUpService } from '../../integration/services/clickup.service';
import { QueueMock, userDummy } from '../../../../test/dummies';
import { PlatformIntegrationsService } from '../../platform-integrations/services/platform-integrations.service';
import { IntegrationPlatforms } from '../../platform-integrations/domain/integration-platforms.enum';
import { BullQueues } from '../../../shared/utils/constants';

// Mock axios and set the type
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ClickUpService', () => {
  let clickUpAuthService: ClickUpAuthService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ConfigService,
        ClickUpAuthService,
        UserRepository,
        ClickUpService,
        PlatformIntegrationsService,
        {
          provide: SENTRY_TOKEN,
          useValue: SentryServiceMock,
        },
        {
          provide: getQueueToken(BullQueues.TIME_LOGS),
          useValue: QueueMock,
        },
      ],
    })
      .overrideProvider(UserRepository)
      .useValue(UserRepositoryMock)
      .overrideProvider(ConfigService)
      .useValue(ConfigServiceMock)
      .overrideProvider(ClickUpService)
      .useValue(ClickUpServiceMock)
      .overrideProvider(PlatformIntegrationsService)
      .useValue(PlatformIntegrationsServiceMock)
      .compile();
    ConfigServiceMock.get.mockReturnValueOnce('clickup-client-id');
    clickUpAuthService = moduleRef.get<ClickUpAuthService>(ClickUpAuthService);
  });

  it('positive: should be defined', () => {
    expect(clickUpAuthService).toBeDefined();
  });

  describe('authorize', () => {
    it('positive: should create platform integration record saving users clickUp credentials', async () => {
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

      await clickUpAuthService.authorize(userDummy.id, {
        code: 'code',
      });

      expect(PlatformIntegrationsServiceMock.updatePlatformIntegration).toHaveBeenCalledWith(
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
