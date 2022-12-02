import { Test } from '@nestjs/testing';
import { Auth0AuthenticationService } from '@app/auth0';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import { Auth0AuthenticationServiceMock, SentryServiceMock } from '../../../../test/mocks/index';
import { AuthService } from './auth.service';
import { Passport } from '../domain/passport.model';

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        Auth0AuthenticationService,
        {
          provide: SENTRY_TOKEN,
          useValue: SentryServiceMock,
        },
      ],
    })
      .overrideProvider(Auth0AuthenticationService)
      .useValue(Auth0AuthenticationServiceMock)
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
});
