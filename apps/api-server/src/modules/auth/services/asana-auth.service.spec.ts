import { Test } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import { ConfigService } from '@nestjs/config';
import { getQueueToken } from '@nestjs/bull';
import axios from 'axios';
import {
  PlatformIntegrationsServiceMock,
  SentryServiceMock,
  AsanaServiceMock,
  ConfigServiceMock,
} from '../../../../test/mocks';
import { UserRepositoryMock } from '../../../../test/mocks/repositories.mock';
import { UserRepository } from '../../user/repositories/user.repository';
import { AsanaAuthService } from './asana-auth.service';
import { AsanaService } from '../../integration/services/asana.service';
import { QueueMock, userDummy } from '../../../../test/dummies';
import { PlatformIntegrationsService } from '../../platform-integrations/services/platform-integrations.service';
import { IntegrationPlatforms } from '../../platform-integrations/domain/integration-platforms.enum';
import { BullQueues } from '../../../shared/utils/constants';

// Mock axios and set the type
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('AsanaService', () => {
  let asanaAuthService: AsanaAuthService;

  beforeEach(async () => {
    jest.resetAllMocks();
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        ConfigService,
        AsanaAuthService,
        UserRepository,
        AsanaService,
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
      .overrideProvider(AsanaService)
      .useValue(AsanaServiceMock)
      .overrideProvider(PlatformIntegrationsService)
      .useValue(PlatformIntegrationsServiceMock)
      .compile();

    asanaAuthService = moduleRef.get<AsanaAuthService>(AsanaAuthService);
  });

  it('positive: should be defined', () => {
    expect(asanaAuthService).toBeDefined();
  });

  describe('authorize', () => {
    it('positive: should create platform integration record saving users asana credentials', async () => {
      ConfigServiceMock.get.mockReturnValueOnce('asana-client-id');
      const authorizationResponseDummy = {
        access_token: 'token',
        expires_in: new Date().valueOf(),
        refresh_token: 'refresh-token',
        data: {
          gid: 'account-id',
        },
      };
      UserRepositoryMock.orm.findOneBy.mockResolvedValue(userDummy);
      mockedAxios.post.mockResolvedValueOnce({
        data: authorizationResponseDummy,
      });

      await asanaAuthService.authorize(userDummy.id, {
        code: 'code',
      });

      expect(PlatformIntegrationsServiceMock.updatePlatformIntegration).toBeCalledWith(
        userDummy.id,
        IntegrationPlatforms.ASANA,
        {
          client_id: undefined,
          refresh_token: authorizationResponseDummy.refresh_token,
          access_token: authorizationResponseDummy.access_token,
          accountId: authorizationResponseDummy.data.gid,
          location: '',
          account_server: '',
        },
        authorizationResponseDummy.data.gid,
      );
    });
  });

  describe('refreshToken', () => {
    it('positive: should update platform integration record saving asana credentials', async () => {
      ConfigServiceMock.get.mockReturnValueOnce('asana-client-id');
      const integrationRecordMock = { data: { refresh_token: 'refresh-token' } };
      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValueOnce(integrationRecordMock);
      const refreshResponseMock = {
        access_token: 'access-token',
      };
      mockedAxios.post.mockResolvedValueOnce({ data: refreshResponseMock });

      await asanaAuthService.refreshToken(userDummy.id);

      expect(PlatformIntegrationsServiceMock.updatePlatformIntegration).toBeCalledWith(
        userDummy.id,
        IntegrationPlatforms.ASANA,
        { access_token: refreshResponseMock.access_token },
      );
    });
  });

  describe('getLoginUrl', () => {
    it('positive: should return redirect url', async () => {
      ConfigServiceMock.get.mockReturnValueOnce('asana-redirect-url');
      ConfigServiceMock.get.mockReturnValueOnce('asana-client-id');
      const isDevelopment = false;
      const result = asanaAuthService.getLoginUrl(isDevelopment);

      const scope = 'default';
      const queryParams: any = {
        client_id: undefined,
        redirect_uri: 'asana-redirect-url',
        response_type: 'code',
        scope,
      };
      const queryParamsStr = Object.keys(queryParams)
        .map((key) => `${key}=${queryParams[key]}`)
        .join('&');

      expect(result).toEqual({
        redirect_url: `https://app.asana.com/-/oauth_authorize?${queryParamsStr}`,
      });
    });
  });

  describe('handleUnauthorizedError', () => {
    it('positive: should call refreshToken', () => {
      const result = asanaAuthService.handleUnauthorizedError(userDummy.id, 0);
      expect(result).resolves.toEqual(1);
    });

    it('negative: should throw error if refresh count is not 0', () => {
      const result = asanaAuthService.handleUnauthorizedError(userDummy.id, 1);
      expect(result).rejects.toThrowError('Unauthorized after retry');
    });
  });
});
