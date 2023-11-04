import { Test } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getQueueToken } from '@nestjs/bull';
import axios from 'axios';
import {
  ConfigServiceMock,
  PlatformIntegrationsServiceMock,
  SentryServiceMock,
  ZohoServiceMock,
} from '../../../../test/mocks';
import { UserRepositoryMock } from '../../../../test/mocks/repositories.mock';
import { UserRepository } from '../../user/repositories/user.repository';
import { ZohoAuthService } from './zoho-auth.service';
import { ZohoService } from '../../integration/services/zoho.service';
import { QueueMock, userDummy } from '../../../../test/dummies';
import { PlatformIntegrationsService } from '../../platform-integrations/services/platform-integrations.service';
import { IntegrationPlatforms } from '../../platform-integrations/domain/integration-platforms.enum';

// Mock axios and set the type
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ZohoService', () => {
  let zohoAuthService: ZohoAuthService;

  beforeEach(async () => {
    jest.resetAllMocks();
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        ZohoAuthService,
        UserRepository,
        JwtService,
        ConfigService,
        ZohoService,
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
      .overrideProvider(ZohoService)
      .useValue(ZohoServiceMock)
      .overrideProvider(ConfigService)
      .useValue(ConfigServiceMock)
      .overrideProvider(PlatformIntegrationsService)
      .useValue(PlatformIntegrationsServiceMock)
      .compile();
    zohoAuthService = moduleRef.get<ZohoAuthService>(ZohoAuthService);
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();
  });

  it('positive: should be defined', () => {
    expect(zohoAuthService).toBeDefined();
  });

  describe('authorize', () => {
    it('positive: should create platform integration record saving users zoho credentials', async () => {
      const locationDummy = 'usa';
      const accountServerDummy = 'www.zoho.com';
      const authorizationResponseDummy = {
        access_token: 'token',
        refresh_token: 'refresh-token',
        expires_in: new Date().valueOf(),
      };
      const userInfoResponseDummy = { ZUID: 12345 };
      UserRepositoryMock.orm.findOneBy.mockResolvedValue(userDummy);
      mockedAxios.post.mockResolvedValueOnce({
        data: authorizationResponseDummy,
      });
      mockedAxios.get.mockResolvedValueOnce({ data: userInfoResponseDummy });

      await zohoAuthService.authorize(userDummy.id, { location: locationDummy, 'accounts-server': accountServerDummy });

      expect(PlatformIntegrationsServiceMock.updatePlatformIntegration).toBeCalledWith(
        userDummy.id,
        IntegrationPlatforms.ZOHO,
        {
          client_id: undefined,
          refresh_token: authorizationResponseDummy.refresh_token,
          access_token: authorizationResponseDummy.access_token,
          accountId: userInfoResponseDummy.ZUID,
          location: locationDummy,
          account_server: accountServerDummy,
        },
        userInfoResponseDummy.ZUID,
      );
    });
  });

  describe('refresh_token: when platform integration record is not found', () => {
    it('negative: should return undefined', async () => {
      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValueOnce(undefined);

      const result = await zohoAuthService.refreshToken(userDummy.id);

      expect(result).toBeUndefined();
      expect(PlatformIntegrationsServiceMock.getPlatformIntegrationData).toHaveBeenCalledWith(
        IntegrationPlatforms.ZOHO,
        userDummy.id,
      );
      expect(mockedAxios.post).not.toHaveBeenCalled();
      expect(PlatformIntegrationsServiceMock.updatePlatformIntegration).not.toHaveBeenCalled();
    });
  });

  describe('refresh_token: when platform integration record is found', () => {
    it('positive: should refresh token and update integration data', async () => {
      const authorizationResponseDummy = {
        account_server: 'https://accounts.zoho.com',
        refresh_token: 'refresh-token-123',
        zohoClientId: 'zoho-client-id',
        zohoClientSecret: 'zoho-client-secret',
      };
      const newAccessToken = 'new-access-token';

      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValueOnce({
        data: authorizationResponseDummy,
      });
      mockedAxios.post.mockResolvedValueOnce({ data: { access_token: newAccessToken } });

      const result = await zohoAuthService.refreshToken(userDummy.id);

      expect(result).toEqual({ access_token: newAccessToken });
      expect(PlatformIntegrationsServiceMock.getPlatformIntegrationData).toHaveBeenCalledWith(
        IntegrationPlatforms.ZOHO,
        userDummy.id,
      );
      expect(PlatformIntegrationsServiceMock.updatePlatformIntegration).toHaveBeenCalledWith(
        userDummy.id,
        IntegrationPlatforms.ZOHO,
        { access_token: newAccessToken },
      );
    });
  });
});
