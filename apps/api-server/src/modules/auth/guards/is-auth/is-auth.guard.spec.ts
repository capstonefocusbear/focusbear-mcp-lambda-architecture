import { Test } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { IsAuth } from './is-auth.guard';
import { Passport } from '../../domain/passport.model';

describe('IsAuth', () => {
  let isAuthGuard: IsAuth;
  const passport = new Passport();

  const context = {
    getType: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({ raw: { passport } }),
    }),
    getHandler: () => ({}),
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [IsAuth, Reflector],
    }).compile();

    isAuthGuard = moduleRef.get<IsAuth>(IsAuth);
  });

  it('should be defined', () => {
    expect(isAuthGuard).toBeDefined();
  });

  describe('canActivate', () => {
    it('positive: should return true value if the user is authorized', async () => {
      context.getType.mockReturnValueOnce('http');
      passport.isAuth = true;

      const result = isAuthGuard.canActivate(context as unknown as ExecutionContext);

      expect(result).toBeTrue();
    });

    it('negative: throw an instance of Unauthorized exception with a decline reason in the message ', async () => {
      context.getType.mockReturnValueOnce('http');
      const testDeclineReasone = 'The token expired!';
      passport.isAuth = false;
      passport.declineReason = testDeclineReasone;
      let exception: any;

      try {
        isAuthGuard.canActivate(context as unknown as ExecutionContext);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(UnauthorizedException);
      expect(exception.message).toEqual(testDeclineReasone);
    });
  });
});
