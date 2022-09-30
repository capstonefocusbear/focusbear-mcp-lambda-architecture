import { Test } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, HttpException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Passport } from '../../../auth/domain/passport.model';
import { HasSubscription } from './has-subscription.guard';

const ReflectorMock = { get: jest.fn() };

describe('HasSubscription', () => {
  let hasSubscription: HasSubscription;
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
      providers: [HasSubscription, Reflector],
    })
      .overrideProvider(Reflector)
      .useValue(ReflectorMock)
      .compile();

    hasSubscription = moduleRef.get<HasSubscription>(HasSubscription);
  });

  it('should be defined', () => {
    expect(hasSubscription).toBeDefined();
  });

  describe('canActivate', () => {
    const user = {
      id: randomUUID(),
      subscriptionStatus: {
        activeEntitlements: ['personal'],
        hasActiveSubscription: true,
      },
    };

    it('negative: is hasActiveSubscription fasle throw 402 error', async () => {
      context.getType.mockReturnValueOnce('http');
      passport.user = user;
      passport.user.subscriptionStatus.hasActiveSubscription = false;
      passport.user.subscriptionStatus.activeEntitlements = [];
      let exception: any;

      try {
        hasSubscription.canActivate(context as unknown as ExecutionContext);
      } catch (error) {
        exception = error;
      }

      const errorMessage = 'The current user has no active subscription!';
      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(HttpException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('negative: if missed required entitlements throw 402 error', async () => {
      context.getType.mockReturnValueOnce('http');
      const acceptedEntitlements = ['team_owner'];
      ReflectorMock.get.mockReset();
      ReflectorMock.get.mockReturnValue(acceptedEntitlements);
      passport.user.subscriptionStatus.hasActiveSubscription = true;
      passport.user.subscriptionStatus.activeEntitlements = ['personal'];
      let exception: any;

      try {
        hasSubscription.canActivate(context as unknown as ExecutionContext);
      } catch (error) {
        exception = error;
      }

      const errorMsg = `The user has no entitlements to get access! Required ones: ${acceptedEntitlements.join(', ')}!`;
      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(HttpException);
      expect(exception.message).toEqual(errorMsg);
    });

    it('positive: should return true value if the user has active subscription and required entitlements', async () => {
      context.getType.mockReturnValueOnce('http');
      const acceptedEntitlements = ['personal'];
      ReflectorMock.get.mockReset();
      ReflectorMock.get.mockReturnValue(acceptedEntitlements);
      passport.user.subscriptionStatus.hasActiveSubscription = true;
      passport.user.subscriptionStatus.activeEntitlements = ['personal'];

      const result = hasSubscription.canActivate(context as unknown as ExecutionContext);

      expect(result).toBeTrue();
    });
  });
});
