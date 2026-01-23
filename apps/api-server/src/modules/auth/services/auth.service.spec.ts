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
import { auth0UserDummy } from '../../../../test/dummies';
import { BullQueues, BullWorkers } from '../../../shared/utils/constants';
import { LanguageOptions } from '../../../shared/domain/language-options.enum';

describe('AuthService', () => {
  let authService: AuthService;
  const i18nServiceMock = mockDeep<I18nService>();
  const emailVerificationQueueMock = { add: jest.fn(), process: jest.fn() };
  const passwordResetEmailQueueMock = { add: jest.fn(), process: jest.fn() };

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
          useValue: emailVerificationQueueMock,
        },
        {
          provide: getQueueToken(BullQueues.PASSWORD_RESET_EMAIL),
          useValue: passwordResetEmailQueueMock,
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
      emailVerificationQueueMock.add.mockResolvedValue({} as any);
    });

    it('positive: should queue verification email job if user is found and not verified', async () => {
      Auth0ManagementServiceMock.getAuth0UsersWithEmail.mockResolvedValue([
        { ...auth0UserDummy, email_verified: false },
      ]);

      const response = await authService.emailConfirmationForGuest({ email: auth0UserDummy.email }, origin);

      expect(Auth0ManagementServiceMock.getAuth0UsersWithEmail).toHaveBeenCalledWith(auth0UserDummy.email);
      expect(emailVerificationQueueMock.add).toHaveBeenCalledWith(
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
      expect(emailVerificationQueueMock.add).toHaveBeenCalled();
      expect(response).toEqual({ data: 'Email verification queued.', status: 202 });
    });

    it('negative: should throw NotFoundException if user is not found', async () => {
      Auth0ManagementServiceMock.getAuth0UsersWithEmail.mockResolvedValue([]);

      await expect(authService.emailConfirmationForGuest({ email: auth0UserDummy.email }, origin)).rejects.toThrow(
        NotFoundException,
      );
      expect(Auth0ManagementServiceMock.getAuth0UsersWithEmail).toHaveBeenCalledWith(auth0UserDummy.email);
      expect(emailVerificationQueueMock.add).not.toHaveBeenCalled();
    });
  });

  describe('requestPasswordReset', () => {
    const origin = 'https://dashboard.focusbear.io';
    const lang = LanguageOptions.ENGLISH;

    beforeEach(() => {
      jest.clearAllMocks();
      passwordResetEmailQueueMock.add.mockResolvedValue({} as any);
      i18nServiceMock.t.mockReturnValue('User');
    });

    it('positive: should queue password reset email job if user exists and email is verified', async () => {
      Auth0ManagementServiceMock.getAuth0UsersWithEmail.mockResolvedValue([
        { ...auth0UserDummy, email_verified: true, identities: [{ isSocial: false }] },
      ]);

      const response = await authService.requestPasswordReset({ email: auth0UserDummy.email, lang }, origin);

      expect(Auth0ManagementServiceMock.getAuth0UsersWithEmail).toHaveBeenCalledWith(auth0UserDummy.email);
      expect(passwordResetEmailQueueMock.add).toHaveBeenCalledWith(
        BullWorkers.SEND_PASSWORD_RESET_EMAIL,
        {
          email: auth0UserDummy.email,
          auth0_id: auth0UserDummy.user_id,
          user_name: auth0UserDummy.given_name,
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

    it('negative: should not enqueue if user does not exist (but still return 202)', async () => {
      Auth0ManagementServiceMock.getAuth0UsersWithEmail.mockResolvedValue([]);

      const response = await authService.requestPasswordReset({ email: auth0UserDummy.email, lang }, origin);

      expect(response).toEqual({ data: 'Password reset email queued.', status: 202 });
      expect(passwordResetEmailQueueMock.add).not.toHaveBeenCalled();
    });

    it('negative: should not enqueue if email is not verified (but still return 202)', async () => {
      Auth0ManagementServiceMock.getAuth0UsersWithEmail.mockResolvedValue([
        { ...auth0UserDummy, email_verified: false, identities: [{ isSocial: false }] },
      ]);

      const response = await authService.requestPasswordReset({ email: auth0UserDummy.email, lang }, origin);

      expect(response).toEqual({ data: 'Password reset email queued.', status: 202 });
      expect(passwordResetEmailQueueMock.add).not.toHaveBeenCalled();
    });

    it('negative: should not enqueue if third-party user (but still return 202)', async () => {
      Auth0ManagementServiceMock.getAuth0UsersWithEmail.mockResolvedValue([
        { ...auth0UserDummy, email_verified: true, identities: [{ isSocial: true }] },
      ]);

      const response = await authService.requestPasswordReset({ email: auth0UserDummy.email, lang }, origin);

      expect(response).toEqual({ data: 'Password reset email queued.', status: 202 });
      expect(passwordResetEmailQueueMock.add).not.toHaveBeenCalled();
    });
  });

  describe('requestPasswordReset', () => {
    const origin = 'https://dashboard.focusbear.io';

    beforeEach(() => {
      jest.clearAllMocks();
      i18nServiceMock.t.mockReturnValue('Friend');

      ConfigServiceMock.get.mockImplementation((key: string) => {
        switch (key) {
          case 'tokens.password_reset.secret':
            return 'password-reset-secret';
          case 'tokens.password_reset.signOptions.expiresIn':
            return '7 days';
          case 'server.devFrontendUrl':
            return 'http://localhost:3000';
          case 'server.frontEndUrl':
            return 'https://dashboard.focusbear.io';
          default:
            return undefined;
        }
      });

      JwtServiceMock.signAsync.mockResolvedValue('reset-token');
      SendGridServiceMock.sendEmail.mockResolvedValue(undefined);
    });

    it('positive: should send reset email with reset_link and verification_link', async () => {
      Auth0ManagementServiceMock.getAuth0UsersWithEmail.mockResolvedValue([
        {
          ...auth0UserDummy,
          email_verified: true,
          identities: [{ isSocial: false }],
        } as any,
      ]);

      const response = await authService.requestPasswordReset(
        { email: auth0UserDummy.email, lang: LanguageOptions.ENGLISH },
        origin,
      );

      expect(JwtServiceMock.signAsync).toHaveBeenCalledWith(
        {
          email: auth0UserDummy.email,
          auth0_id: auth0UserDummy.user_id,
        },
        expect.objectContaining({
          secret: 'password-reset-secret',
          expiresIn: '7 days',
        }),
      );

      expect(SendGridServiceMock.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: auth0UserDummy.email,
          templateId: expect.any(String),
          dynamicTemplateData: expect.objectContaining({
            reset_link: 'https://dashboard.focusbear.io/reset-password?token=reset-token',
            verification_link: 'https://dashboard.focusbear.io/reset-password?token=reset-token',
            resetLink: 'https://dashboard.focusbear.io/reset-password?token=reset-token',
          }),
        }),
      );

      expect(response).toEqual({ data: 'Password reset link sent.', status: 201 });
    });

    it('positive: should treat missing identities as non-social', async () => {
      Auth0ManagementServiceMock.getAuth0UsersWithEmail.mockResolvedValue([
        {
          ...auth0UserDummy,
          email_verified: true,
          identities: undefined,
        } as any,
      ]);

      await authService.requestPasswordReset({ email: auth0UserDummy.email, lang: LanguageOptions.ENGLISH }, origin);

      expect(SendGridServiceMock.sendEmail).toHaveBeenCalled();
    });
  });
});
