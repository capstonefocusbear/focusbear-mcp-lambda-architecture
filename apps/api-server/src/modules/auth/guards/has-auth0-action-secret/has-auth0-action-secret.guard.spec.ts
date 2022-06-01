import { Test } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HasAuth0ActionSecret } from './has-auth0-action-secret.guard';
import { ConfigServiceMock } from '../../../../../test/mocks';

describe('HasAuth0ActionSecret', () => {
  const TEST_SECRET = 'some key';
  let hasAuth0ActionSecretGuard;

  const headers = {
    auth0_action_secret: TEST_SECRET,
  };

  const context = {
    getType: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({ raw: { headers } }),
    }),
    getHandler: () => ({}),
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [HasAuth0ActionSecret, Reflector, ConfigService],
    })
      .overrideProvider(ConfigService)
      .useValue(ConfigServiceMock)
      .compile();

    hasAuth0ActionSecretGuard = moduleRef.get<HasAuth0ActionSecret>(HasAuth0ActionSecret);
  });

  it('should be defined', () => {
    expect(hasAuth0ActionSecretGuard).toBeDefined();
  });

  describe('canActivate', () => {
    it('positive: should return true value if has correct secret in the header', async () => {
      context.getType.mockReturnValueOnce('http');
      ConfigServiceMock.get.mockReturnValueOnce(TEST_SECRET);

      const result = hasAuth0ActionSecretGuard.canActivate(context as unknown as ExecutionContext);

      expect(result).toBeTrue();
    });

    it('negative: throw an instance of Unauthorized exception', async () => {
      context.getType.mockReturnValueOnce('http');
      ConfigServiceMock.get.mockReturnValueOnce('Wrong secret...');
      const testDeclineReasone = 'Invalid Auth0 action secret!';
      let exception: any;

      try {
        hasAuth0ActionSecretGuard.canActivate(context as unknown as ExecutionContext);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(UnauthorizedException);
      expect(exception.message).toEqual(testDeclineReasone);
    });
  });
});
