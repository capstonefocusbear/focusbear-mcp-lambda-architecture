import { Test } from '@nestjs/testing';
import { Auth0AuthenticationService, Auth0ManagementService } from '@app/auth0';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import { NotFoundException } from '@nestjs/common';
import {
  Auth0AuthenticationServiceMock,
  Auth0ManagementServiceMock,
  SentryServiceMock,
  UserRepositoryMock,
} from '../../../../test/mocks/index';
import { AuthService } from './auth.service';
import { Passport } from '../domain/passport.model';
import { UserRepository } from '../../user/repositories/user.repository';
import { auth0UserDummy } from '../../../../test/dummies';

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        Auth0AuthenticationService,
        Auth0ManagementService,
        UserRepository,
        {
          provide: SENTRY_TOKEN,
          useValue: SentryServiceMock,
        },
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
    it('positive: should send verification email if user is found and not verified', async () => {
      Auth0ManagementServiceMock.getAuth0UserWithEmail.mockResolvedValue([
        { ...auth0UserDummy, email_verified: false },
      ]);
      Auth0ManagementServiceMock.resendEmailVerification.mockResolvedValue({
        data: 'Verification email sent.',
        status: 200,
      });

      const response = await authService.emailConfirmationForGuest({ email: auth0UserDummy.email });

      expect(Auth0ManagementServiceMock.getAuth0UserWithEmail).toHaveBeenCalledWith(auth0UserDummy.email);
      expect(response).toEqual({ data: 'Verification email sent.', status: 200 });
    });

    it('negative: should return already verified message if user email is already verified', async () => {
      Auth0ManagementServiceMock.getAuth0UserWithEmail.mockResolvedValue([{ ...auth0UserDummy, email_verified: true }]);
      Auth0ManagementServiceMock.resendEmailVerification.mockReset();

      const response = await authService.emailConfirmationForGuest({ email: auth0UserDummy.email });

      expect(Auth0ManagementServiceMock.getAuth0UserWithEmail).toHaveBeenCalledWith(auth0UserDummy.email);
      expect(Auth0ManagementServiceMock.resendEmailVerification).not.toHaveBeenCalled();
      expect(response).toEqual({ data: 'Email is already verified.', status: 200 });
    });

    it('negative: should throw NotFoundException if user is not found', async () => {
      Auth0ManagementServiceMock.getAuth0UserWithEmail.mockResolvedValue([]);
      Auth0ManagementServiceMock.resendEmailVerification.mockReset();

      await expect(authService.emailConfirmationForGuest({ email: auth0UserDummy.email })).rejects.toThrow(
        NotFoundException,
      );
      expect(Auth0ManagementServiceMock.getAuth0UserWithEmail).toHaveBeenCalledWith(auth0UserDummy.email);
      expect(Auth0ManagementServiceMock.resendEmailVerification).not.toHaveBeenCalled();
    });
  });
});
