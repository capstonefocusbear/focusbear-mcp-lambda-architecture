import { Test } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import { ConfigService } from '@nestjs/config';
import { getQueueToken } from '@nestjs/bull';
import axios from 'axios';
import {
  PlatformIntegrationsServiceMock,
  SentryServiceMock,
  TrelloServiceMock,
  ConfigServiceMock,
} from '../../../../test/mocks';
import { UserRepositoryMock } from '../../../../test/mocks/repositories.mock';
import { UserRepository } from '../../user/repositories/user.repository';
import { TrelloAuthService } from './trello-auth.service';
import { TrelloService } from '../../integration/services/trello.service';
import { QueueMock, userDummy } from '../../../../test/dummies';
import { PlatformIntegrationsService } from '../../platform-integrations/services/platform-integrations.service';
import { IntegrationPlatforms } from '../../platform-integrations/domain/integration-platforms.enum';

// Mock axios and set the type
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('TrelloAuthService', () => {
  let trelloAuthService: TrelloAuthService;

  beforeEach(async () => {
    jest.resetAllMocks();
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        ConfigService,
        TrelloAuthService,
        UserRepository,
        TrelloService,
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
      .overrideProvider(TrelloService)
      .useValue(TrelloServiceMock)
      .overrideProvider(PlatformIntegrationsService)
      .useValue(PlatformIntegrationsServiceMock)
      .compile();
    ConfigServiceMock.get.mockReturnValueOnce('trello-client-id');
    trelloAuthService = moduleRef.get<TrelloAuthService>(TrelloAuthService);
  });

  it('positive: should be defined', () => {
    expect(trelloAuthService).toBeDefined();
  });

  describe('authorize', () => {
    it('positive: should create platform integration record saving users trello credentials', async () => {
      const code = 'trello-code';
      const accountId = 'account-id';
      UserRepositoryMock.orm.findOneBy.mockResolvedValue(userDummy);
      mockedAxios.get.mockResolvedValueOnce({
        data: { id: accountId },
      });
      const headers = {
        'Content-Type': 'application/json',
      };

      await trelloAuthService.authorize(userDummy.id, { code });

      expect(PlatformIntegrationsServiceMock.updatePlatformIntegration).toBeCalledWith(
        userDummy.id,
        IntegrationPlatforms.TRELLO,
        {
          client_id: undefined,
          refresh_token: '',
          access_token: code,
          accountId,
          location: '',
          account_server: '',
        },
        accountId,
      );
      expect(mockedAxios.get).toHaveBeenCalledWith(
        `https://api.trello.com/1/members/me?key=${undefined}&token=${code}`,
        { headers },
      );
    });
  });
});
