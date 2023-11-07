import { Test } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import { ConfigService } from '@nestjs/config';
import { getQueueToken } from '@nestjs/bull';
import axios from 'axios';
import {
  PlatformIntegrationsServiceMock,
  SentryServiceMock,
  JiraServiceMock,
  ConfigServiceMock,
} from '../../../../test/mocks';
import { UserRepositoryMock } from '../../../../test/mocks/repositories.mock';
import { UserRepository } from '../../user/repositories/user.repository';
import { JiraAuthService } from './jira-auth.service';
import { JiraService } from '../../integration/services/jira.service';
import { QueueMock, userDummy } from '../../../../test/dummies';
import { PlatformIntegrationsService } from '../../platform-integrations/services/platform-integrations.service';
import { IntegrationPlatforms } from '../../platform-integrations/domain/integration-platforms.enum';

// Mock axios and set the type
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('JiraService', () => {
  let jiraAuthService: JiraAuthService;

  beforeEach(async () => {
    jest.resetAllMocks();
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        ConfigService,
        JiraAuthService,
        UserRepository,
        JiraService,
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
      .overrideProvider(JiraService)
      .useValue(JiraServiceMock)
      .overrideProvider(PlatformIntegrationsService)
      .useValue(PlatformIntegrationsServiceMock)
      .compile();
    ConfigServiceMock.get.mockReturnValueOnce('jira-client-id');
    jiraAuthService = moduleRef.get<JiraAuthService>(JiraAuthService);
  });

  it('positive: should be defined', () => {
    expect(jiraAuthService).toBeDefined();
  });

  describe('authorize', () => {
    it('positive: should create platform integration record saving users jira credentials', async () => {
      const authorizationResponseDummy = {
        access_token: 'token',
        expires_in: new Date().valueOf(),
        refresh_token: 'refresh-token',
      };
      const userInfoResponseDummy = { account_id: 12345 };
      UserRepositoryMock.orm.findOneBy.mockResolvedValue(userDummy);
      mockedAxios.post.mockResolvedValueOnce({
        data: authorizationResponseDummy,
      });
      mockedAxios.get.mockResolvedValueOnce({
        data: userInfoResponseDummy,
      });

      await jiraAuthService.authorize(userDummy.id, {
        code: 'code',
      });

      expect(PlatformIntegrationsServiceMock.updatePlatformIntegration).toBeCalledWith(
        userDummy.id,
        IntegrationPlatforms.JIRA,
        {
          client_id: undefined,
          refresh_token: authorizationResponseDummy.refresh_token,
          access_token: authorizationResponseDummy.access_token,
          accountId: userInfoResponseDummy.account_id,
          location: '',
          account_server: '',
        },
        userInfoResponseDummy.account_id,
      );
      const headers = { Authorization: `Bearer ${authorizationResponseDummy.access_token}` };

      expect(mockedAxios.get).toHaveBeenCalledWith('https://api.atlassian.com/me', { headers });
    });
  });

  describe('refreshToken', () => {
    it('positive: should update platform integration record saving asana credentials', async () => {
      const integrationRecordMock = { data: { refresh_token: 'refresh-token' } };
      PlatformIntegrationsServiceMock.getPlatformIntegrationData.mockResolvedValueOnce(integrationRecordMock);
      const refreshResponseMock = {
        access_token: 'access-token',
      };
      mockedAxios.post.mockResolvedValueOnce({ data: refreshResponseMock });

      await jiraAuthService.refreshToken(userDummy.id);

      expect(PlatformIntegrationsServiceMock.updatePlatformIntegration).toBeCalledWith(
        userDummy.id,
        IntegrationPlatforms.JIRA,
        { access_token: refreshResponseMock.access_token },
      );
    });
  });

  describe('getLoginUrl', () => {
    it('positive: should return redirect url', async () => {
      const redirect = jiraAuthService.getLoginUrl();
      const scopes = [
        'offline_access',
        'read%3Ajira-work',
        'manage%3Ajira-project',
        'manage%3Ajira-configuration',
        'read%3Ajira-user',
        'write%3Ajira-work',
        'manage%3Ajira-webhook',
        'manage%3Ajira-data-provider',
        'read%3Ame',
        'read%3Aaccount',
      ];
      const queryParams: any = {
        audience: 'api.atlassian.com',
        scope: scopes.join('%20'),
        client_id: undefined,
        redirect_uri: undefined,
        response_type: 'code',
        prompt: 'consent',
      };
      const queryParamsStr = Object.keys(queryParams)
        .map((key) => `${key}=${queryParams[key]}`)
        .join('&');
      expect(redirect).toEqual({
        redirect_url: `https://auth.atlassian.com/authorize?${queryParamsStr}`,
      });
    });
  });

  describe('handleUnauthorizedError', () => {
    it('positive: should call refreshToken', () => {
      const result = jiraAuthService.handleUnauthorizedError(userDummy.id, 0);
      expect(result).resolves.toEqual(1);
    });

    it('negative: should throw error if refresh count is not 0', () => {
      const result = jiraAuthService.handleUnauthorizedError(userDummy.id, 1);
      expect(result).rejects.toThrowError('Unauthorized after retry');
    });
  });
});
