import { Test } from '@nestjs/testing';
import { Auth0AuthenticationService, Auth0ManagementService } from '@app/auth0';
import { SENTRY_TOKEN } from '@app/observability';
import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { I18nService } from 'nestjs-i18n';
import { mockDeep } from 'jest-mock-extended';
import { getQueueToken } from '@nestjs/bull';
import {
  Auth0AuthenticationServiceMock,
  Auth0ManagementServiceMock,
  ConfigServiceMock,
  JwtServiceMock,
  SentryServiceMock,
  UserRepositoryMock,
} from '../../../../test/mocks/index';
import { AuthService } from './auth.service';
import { Passport } from '../domain/passport.model';
import { UserRepository } from '../../user/repositories/user.repository';
import { auth0UserDummy, QueueMock } from '../../../../test/dummies';
import { BullQueues, BullWorkers } from '../../../shared/utils/constants';
import { LanguageOptions } from '../../../shared/domain/language-options.enum';

describe('AuthService', () => {
  let authService: AuthService;
  const i18nServiceMock = mockDeep<I18nService>();

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: ConfigService,
          useValue: ConfigServiceMock,
        },
        {
          provide: 'EmailVerificationJwtService',
          useValue: JwtServiceMock,
        },
        {
          provide: 'ResetPasswordJwtService',
          useValue: JwtServiceMock,
        },
        {
          provide: JwtService,
          useValue: JwtServiceMock,
        },
        {
          provide: I18nService,
          useValue: i18nServiceMock,
        },
        {
          provide: SENTRY_TOKEN,
          useValue: SentryServiceMock,
        },
        {
          provide: getQueueToken(BullQueues.EMAIL_VERIFICATION),
          useValue: QueueMock,
        },
        {
          provide: getQueueToken(BullQueues.PASSWORD_RESET_EMAIL),
          useValue: QueueMock,
        },
        Auth0AuthenticationService,
        Auth0ManagementService,
        UserRepository,
      ],
    })
      .overrideProvider(Auth0AuthenticationService)
      .useValue(Auth0AuthenticationServiceMock)
      .overrideProvider(Auth0ManagementService)
      .useValue(Auth0ManagementServiceMock)
      .overrideProvider(UserRepository)
      .useValue(UserRepositoryMock)
      .compile();

    authService = moduleRef.get<AuthService>(AuthService);
  });

  afterEach(() => {
    ConfigServiceMock.get.mockReset();
  });

  it('should be defined', () => {
    expect(authService).toBeDefined();
  });

  describe('authenticate', () => {
    const authorization = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
    const headers = { authorization };
    const payload = { aud: 'aud' };
    const declineReason = 'Some decline reasone message!';

    it('positive: should return an authorized Passport instance', async () => {
      Auth0AuthenticationServiceMock.validateAccessToken.mockResolvedValueOnce([true, { payload }]);

      const result = await authService.authenticate(headers);

      expect(result).toBeInstanceOf(Passport);
      expect(result.isAuth).toBeTrue();
      expect(result.declineReason).toBeNull();
    });

    it('negative: should return an unauthorized Passport instance', async () => {
      Auth0AuthenticationServiceMock.validateAccessToken.mockResolvedValueOnce([false, { declineReason }]);

      const result = await authService.authenticate(headers);

      expect(result).toBeInstanceOf(Passport);
      expect(result.isAuth).toBeFalse();
      expect(result.declineReason).toEqual(declineReason);
    });
  });

  describe('openEmailConfirmation', () => {
    const origin = 'https://dashboard.focusbear.io';
    beforeEach(() => {
      jest.clearAllMocks();
      QueueMock.add.mockResolvedValue({} as any);
    });

    it('positive: should queue verification email job if user is found and not verified', async () => {
      Auth0ManagementServiceMock.getAuth0UsersWithEmail.mockResolvedValue([
        { ...auth0UserDummy, email_verified: false },
      ]);

      const response = await authService.emailConfirmationForGuest({ email: auth0UserDummy.email }, origin);

      expect(Auth0ManagementServiceMock.getAuth0UsersWithEmail).toHaveBeenCalledWith(auth0UserDummy.email);
      expect(QueueMock.add).toHaveBeenCalledWith(
        BullWorkers.SEND_EMAIL_VERIFICATION,
        {
          email: auth0UserDummy.email,
          origin,
        },
        expect.objectContaining({
          attempts: 3,
          backoff: expect.objectContaining({
            type: 'exponential',
            delay: 2000,
          }),
        }),
      );
      expect(response).toEqual({ data: 'Email verification queued.', status: 202 });
    });

    it('positive: should queue job even if user email is already verified (handled in consumer)', async () => {
      Auth0ManagementServiceMock.getAuth0UsersWithEmail.mockResolvedValue([
        { ...auth0UserDummy, email_verified: true },
      ]);

      const response = await authService.emailConfirmationForGuest({ email: auth0UserDummy.email }, origin);

      expect(Auth0ManagementServiceMock.getAuth0UsersWithEmail).toHaveBeenCalledWith(auth0UserDummy.email);
      expect(QueueMock.add).toHaveBeenCalled();
      expect(response).toEqual({ data: 'Email verification queued.', status: 202 });
    });

    it('negative: should throw NotFoundException if user is not found', async () => {
      Auth0ManagementServiceMock.getAuth0UsersWithEmail.mockResolvedValue([]);

      await expect(authService.emailConfirmationForGuest({ email: auth0UserDummy.email }, origin)).rejects.toThrow(
        NotFoundException,
      );
      expect(Auth0ManagementServiceMock.getAuth0UsersWithEmail).toHaveBeenCalledWith(auth0UserDummy.email);
      expect(QueueMock.add).not.toHaveBeenCalled();
    });
  });

  describe('requestPasswordReset', () => {
    const origin = 'https://dashboard.focusbear.io';
    const lang = LanguageOptions.ENGLISH;

    beforeEach(() => {
      jest.clearAllMocks();
      QueueMock.add.mockResolvedValue({} as any);
      i18nServiceMock.t.mockReturnValue('User');
    });

    it('positive: should queue password reset email job if user exists and email is verified', async () => {
      Auth0ManagementServiceMock.getAuth0UsersWithEmail.mockResolvedValue([
        { ...auth0UserDummy, email_verified: true },
      ]);

      const response = await authService.requestPasswordReset({ email: auth0UserDummy.email, lang }, origin);

      expect(Auth0ManagementServiceMock.getAuth0UsersWithEmail).toHaveBeenCalledWith(auth0UserDummy.email);
      expect(QueueMock.add).toHaveBeenCalledWith(
        BullWorkers.SEND_PASSWORD_RESET_EMAIL,
        {
          email: auth0UserDummy.email,
          auth0_id: auth0UserDummy.user_id,
          user_name: auth0UserDummy.name,
          origin,
        },
        expect.objectContaining({
          attempts: 3,
          backoff: expect.objectContaining({
            type: 'exponential',
            delay: 2000,
          }),
        }),
      );
      expect(response).toEqual({ data: 'Password reset email queued.', status: 202 });
    });

    it('negative: should throw NotFoundException if user does not exist', async () => {
      Auth0ManagementServiceMock.getAuth0UsersWithEmail.mockResolvedValue([]);

      await expect(authService.requestPasswordReset({ email: auth0UserDummy.email, lang }, origin)).rejects.toThrow(
        NotFoundException,
      );
      expect(QueueMock.add).not.toHaveBeenCalled();
    });
  });
});
