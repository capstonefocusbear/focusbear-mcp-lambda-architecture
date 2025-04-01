import { Test } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getQueueToken } from '@nestjs/bull';
import axios from 'axios';
import { DateTime } from 'luxon';

import { ConfigServiceMock, PlatformIntegrationsServiceMock, SentryServiceMock } from '../../../../test/mocks';
import { UserRepositoryMock } from '../../../../test/mocks/repositories.mock';
import { UserRepository } from '../../user/repositories/user.repository';
import { GoogleAuthService } from './google-auth.service';
import { GoogleCalendarService } from '../../calendar/services/google-calendar.service';
import { QueueMock, userDummy } from '../../../../test/dummies';
import { PlatformIntegrationsService } from '../../platform-integrations/services/platform-integrations.service';
import { IntegrationPlatforms } from '../../platform-integrations/domain/integration-platforms.enum';
import { BullQueues } from '../../../shared/utils/constants';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('GoogleAuthService', () => {
  let googleAuthService: GoogleAuthService;
  process.env = { JWT_SECRET: 'test-secret' };

  // Create a dummy mock for GoogleCalendarService similar to other mocks.
  const GoogleCalendarServiceMock = {
    updateEvents: jest.fn(),
  };

  beforeAll(async () => {
    jest.resetAllMocks();
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          global: true,
          secret: process.env.JWT_SECRET,
          signOptions: { expiresIn: '60s' },
        }),
      ],
      providers: [
        GoogleAuthService,
        UserRepository,
        JwtService,
        ConfigService,
        GoogleCalendarService,
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
      .overrideProvider(PlatformIntegrationsService)
      .useValue(PlatformIntegrationsServiceMock)
      .overrideProvider(GoogleCalendarService)
      .useValue(GoogleCalendarServiceMock)
      .compile();

    googleAuthService = moduleRef.get<GoogleAuthService>(GoogleAuthService);
  });

  it('positive: should be defined', () => {
    expect(googleAuthService).toBeDefined();
  });

  describe('getLoginUrl', () => {
    it('positive: should return an object with a redirect_url string', () => {
      const result = googleAuthService.getLoginUrl();
      expect(result).toHaveProperty('redirect_url');
      expect(typeof result.redirect_url).toBe('string');
      expect(result.redirect_url).toContain('https://');
    });
  });

  describe('authorize', () => {
    it("positive: should create platform integration record saving user's Google credentials", async () => {
      const validAuthData = {
        access_token: 'valid-token',
        refresh_token: 'valid-refresh-token',
        expiry_date: DateTime.now().plus({ hours: 1 }).toSeconds(),
      };
      const authorizeQuery = { code: 'valid-code' };
      const userInfoResponseDummy = { email: 'user@example.com' };

      UserRepositoryMock.orm.findOneBy.mockResolvedValue(userDummy);

      mockedAxios.get.mockResolvedValueOnce({ data: userInfoResponseDummy });

      jest.spyOn(googleAuthService as any, 'requestAuthorize').mockResolvedValue(validAuthData);

      const result = await googleAuthService.authorize(userDummy.id, authorizeQuery);

      expect(result).toEqual({ message: 'Successfully authenticated with Google' });
      expect(PlatformIntegrationsServiceMock.updatePlatformIntegration).toHaveBeenCalledWith(
        userDummy.id,
        IntegrationPlatforms.GOOGLE,
        validAuthData,
        userInfoResponseDummy.email,
      );
      expect(GoogleCalendarServiceMock.updateEvents).toHaveBeenCalledWith(userDummy.id, userInfoResponseDummy.email);
    });

    it('negative: should log error and return undefined if user not found', async () => {
      const validAuthData = {
        access_token: 'valid-token',
        refresh_token: 'valid-refresh-token',
        expiry_date: DateTime.now().plus({ hours: 1 }).toSeconds(),
      };
      const authorizeQuery = { code: 'valid-code' };
      const userInfoResponseDummy = { email: 'user@example.com' };

      // Simulate that no user is found in the repository
      UserRepositoryMock.orm.findOneBy.mockResolvedValue(null);
      mockedAxios.get.mockResolvedValueOnce({ data: userInfoResponseDummy });
      jest.spyOn(googleAuthService as any, 'requestAuthorize').mockResolvedValue(validAuthData);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const result = await googleAuthService.authorize(userDummy.id, authorizeQuery);

      expect(consoleSpy).toHaveBeenCalled();
      expect(result).toBeUndefined();
      consoleSpy.mockRestore();
    });

    it('negative: should log error and return undefined if access_token is missing', async () => {
      const invalidAuthData = {
        // access_token missing
        refresh_token: 'valid-refresh-token',
        expiry_date: DateTime.now().plus({ hours: 1 }).toSeconds(),
      };
      const authorizeQuery = { code: 'valid-code' };

      jest.spyOn(googleAuthService as any, 'requestAuthorize').mockResolvedValue(invalidAuthData);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const result = await googleAuthService.authorize(userDummy.id, authorizeQuery);

      expect(consoleSpy).toHaveBeenCalled();
      expect(result).toBeUndefined();
      consoleSpy.mockRestore();
    });

    it('negative: should log error and return undefined if refresh_token is missing', async () => {
      const invalidAuthData = {
        access_token: 'valid-token',
        // refresh_token missing
        expiry_date: DateTime.now().plus({ hours: 1 }).toSeconds(),
      };
      const authorizeQuery = { code: 'valid-code' };

      jest.spyOn(googleAuthService as any, 'requestAuthorize').mockResolvedValue(invalidAuthData);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const result = await googleAuthService.authorize(userDummy.id, authorizeQuery);

      expect(consoleSpy).toHaveBeenCalled();
      expect(result).toBeUndefined();
      consoleSpy.mockRestore();
    });

    it('negative: should log error and return undefined if the token is expired', async () => {
      const expiredAuthData = {
        access_token: 'valid-token',
        refresh_token: 'valid-refresh-token',
        expiry_date: DateTime.now().minus({ hours: 1 }).toSeconds(), // token expired
      };
      const authorizeQuery = { code: 'valid-code' };

      jest.spyOn(googleAuthService as any, 'requestAuthorize').mockResolvedValue(expiredAuthData);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const result = await googleAuthService.authorize(userDummy.id, authorizeQuery);

      expect(consoleSpy).toHaveBeenCalled();
      expect(result).toBeUndefined();
      consoleSpy.mockRestore();
    });

    describe('saveUserData', () => {
      it('positive (new integration): should save user data and create a new integration record when none exists', async () => {
        const authData = {
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          expiry_date: DateTime.now().plus({ hours: 1 }).toSeconds(),
        };
        const accountId = 'user@example.com';

        // Simulate that the user exists
        UserRepositoryMock.orm.findOneBy.mockResolvedValue(userDummy);

        await googleAuthService.saveUserData(userDummy.id, authData, accountId);

        expect(PlatformIntegrationsServiceMock.updatePlatformIntegration).toHaveBeenCalledWith(
          userDummy.id,
          IntegrationPlatforms.GOOGLE,
          authData,
          accountId,
        );
      });

      it('positive (updating existing integration): should update integration data for an existing integration record', async () => {
        const authData = {
          access_token: 'updated-access-token',
          refresh_token: 'updated-refresh-token',
          expiry_date: DateTime.now().plus({ hours: 2 }).toSeconds(),
        };
        const accountId = 'user@example.com';

        // Simulate that the user exists
        UserRepositoryMock.orm.findOneBy.mockResolvedValue(userDummy);

        await googleAuthService.saveUserData(userDummy.id, authData, accountId);

        expect(PlatformIntegrationsServiceMock.updatePlatformIntegration).toHaveBeenCalledWith(
          userDummy.id,
          IntegrationPlatforms.GOOGLE,
          authData,
          accountId,
        );
      });
    });
  });
});
