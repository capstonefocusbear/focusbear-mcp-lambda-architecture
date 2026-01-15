import { Test } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@app/observability';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getQueueToken } from '@nestjs/bull';
import axios from 'axios';
import {
  PlatformIntegrationsServiceMock,
  SentryServiceMock,
  MondayServiceMock,
  ConfigServiceMock,
  JwtServiceMock,
} from '../../../../test/mocks';
import { UserRepositoryMock } from '../../../../test/mocks/repositories.mock';
import { UserRepository } from '../../user/repositories/user.repository';
import { MondayAuthService } from './monday-auth.service';
import { MondayService } from '../../integration/services/monday.service';
import { QueueMock, userDummy } from '../../../../test/dummies';
import { PlatformIntegrationsService } from '../../platform-integrations/services/platform-integrations.service';
import { IntegrationPlatforms } from '../../platform-integrations/domain/integration-platforms.enum';
import { BullQueues } from '../../../shared/utils/constants';

// Mock axios and set the type
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('MondayService', () => {
  let mondayAuthService: MondayAuthService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ConfigService,
        MondayAuthService,
        UserRepository,
        JwtService,
        MondayService,
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
      .overrideProvider(JwtService)
      .useValue(JwtServiceMock)
      .overrideProvider(MondayService)
      .useValue(MondayServiceMock)
      .overrideProvider(PlatformIntegrationsService)
      .useValue(PlatformIntegrationsServiceMock)
      .compile();
    ConfigServiceMock.get.mockReturnValueOnce('monday-client-id');
    mondayAuthService = moduleRef.get<MondayAuthService>(MondayAuthService);
  });

  it('positive: should be defined', () => {
    expect(mondayAuthService).toBeDefined();
  });

  describe('authorize', () => {
    it('positive: should create platform integration record saving users monday credentials', async () => {
      const locationDummy = 'usa';
      const accountServerDummy = 'https://auth.monday.com';
      const authorizationResponseDummy = {
        access_token: 'token',
        expires_in: new Date().valueOf(),
      };
      const userInfoResponseDummy = { account_id: 12345 };
      UserRepositoryMock.orm.findOneBy.mockResolvedValue(userDummy);
      mockedAxios.post
        .mockResolvedValueOnce({
          data: authorizationResponseDummy,
        })
        .mockResolvedValueOnce({
          data: userInfoResponseDummy,
        });

      await mondayAuthService.authorize(userDummy.id, {
        location: locationDummy,
        'accounts-server': accountServerDummy,
      });

      expect(PlatformIntegrationsServiceMock.updatePlatformIntegration).toHaveBeenCalledWith(
        userDummy.id,
        IntegrationPlatforms.MONDAY,
        {
          client_id: undefined,
          refresh_token: '',
          access_token: authorizationResponseDummy.access_token,
          accountId: userInfoResponseDummy.account_id,
          location: locationDummy,
          account_server: accountServerDummy,
        },
        userInfoResponseDummy.account_id,
      );
    });
  });
});
