import { Test } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@app/observability';
import { ConfigService } from '@nestjs/config';
import { getQueueToken } from '@nestjs/bull';
import axios from 'axios';
import {
  ConfigServiceMock,
  MicrosoftCalendarServiceMock,
  PlatformIntegrationsServiceMock,
  SentryServiceMock,
} from '../../../../test/mocks';
import { UserRepositoryMock } from '../../../../test/mocks/repositories.mock';
import { UserRepository } from '../../user/repositories/user.repository';
import { QueueMock, userDummy } from '../../../../test/dummies';
import { PlatformIntegrationsService } from '../../platform-integrations/services/platform-integrations.service';
import { IntegrationPlatforms } from '../../platform-integrations/domain/integration-platforms.enum';
import { MicrosoftAuthService } from './microsoft-auth.service';
import { MicrosoftCalendarService } from '../../calendar/services/microsoft-calendar.service';
import { BullQueues } from '../../../shared/utils/constants';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('MicrosfotService', () => {
  let microsoftAuthService: MicrosoftAuthService;
  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ConfigService,
        MicrosoftAuthService,
        UserRepository,
        MicrosoftCalendarService,
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
      .overrideProvider(MicrosoftCalendarService)
      .useValue(MicrosoftCalendarServiceMock)
      .overrideProvider(PlatformIntegrationsService)
      .useValue(PlatformIntegrationsServiceMock)
      .compile();
    ConfigServiceMock.get.mockReturnValueOnce('microsoft-tetant-id');
    microsoftAuthService = moduleRef.get<MicrosoftAuthService>(MicrosoftAuthService);
  });

  it('positive: should be defined', () => {
    expect(microsoftAuthService).toBeDefined();
  });

  describe('authroize', () => {
    it('positive: should create platform integration record saving users google credentials', async () => {
      const authorizationResponseDummy = {
        access_token: 'token',
        expires_in: 0,
        refresh_token: 'refresh-token',
      };

      UserRepositoryMock.orm.findOneBy.mockResolvedValue(userDummy);
      mockedAxios.post.mockResolvedValueOnce({
        data: authorizationResponseDummy,
      });
      const mail = 'mail@gmail.com';
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          mail,
        },
      });
      await microsoftAuthService.authorize(userDummy.id, {
        code: 'code',
      });

      expect(PlatformIntegrationsServiceMock.updatePlatformIntegration).toHaveBeenCalledWith(
        userDummy.id,
        IntegrationPlatforms.MICROSOFT,
        {
          client_id: undefined,
          refresh_token: authorizationResponseDummy.refresh_token,
          access_token: authorizationResponseDummy.access_token,
          expiry_date: expect.toBeNumber(),
          accountId: mail,
          location: '',
          account_server: '',
        },
        mail,
      );
    });
  });
});
