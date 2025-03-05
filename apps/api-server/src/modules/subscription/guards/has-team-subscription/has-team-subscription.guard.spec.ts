import { Test } from '@nestjs/testing';
import { StripeService } from '@app/stripe';
import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import Stripe from 'stripe';
import { HasTeamSubscription } from './has-team-subscription.guard';
import { TeamManagementService } from '../../../team/services/team-management/team-management.service';
import { PaymentType } from '../../../team/domain/payment-type.enum';
import { dummySubscriptionTeamWithMembers, TeamWithMembersDummy } from '../../../../../test/dummies';

describe('HasTeamSubscription', () => {
  let guard: HasTeamSubscription;
  let teamManagementService: TeamManagementService;
  let stripeService: StripeService;

  const mockExecutionContext = (body: any) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ body }),
      }),
    } as ExecutionContext);

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        HasTeamSubscription,
        {
          provide: TeamManagementService,
          useValue: {
            getTeamById: jest.fn(),
          },
        },
        {
          provide: StripeService,
          useValue: {
            subscriptions: {
              retrieve: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    guard = moduleRef.get<HasTeamSubscription>(HasTeamSubscription);
    teamManagementService = moduleRef.get<TeamManagementService>(TeamManagementService);
    stripeService = moduleRef.get<StripeService>(StripeService);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    const dummyTeamSubscription = dummySubscriptionTeamWithMembers as Stripe.Response<Stripe.Subscription>;

    it('negative: should throw HttpException when team has no subscription ID', async () => {
      jest.spyOn(teamManagementService, 'getTeamById').mockResolvedValue({
        payment_type: PaymentType.STRIPE,
        stripe_data: {},
      });

      await expect(guard.canActivate(mockExecutionContext({ team_id: TeamWithMembersDummy.id }))).rejects.toThrow(
        new HttpException(
          {
            statusCode: HttpStatus.BAD_REQUEST,
            message: `No subscription ID found for the team with team_id: ${TeamWithMembersDummy.id}`,
          },
          HttpStatus.BAD_REQUEST,
        ),
      );
    });

    it('negative: should throw HttpException when subscription is not found', async () => {
      const team_id = '123';
      jest.spyOn(teamManagementService, 'getTeamById').mockResolvedValue({
        payment_type: PaymentType.STRIPE,
        stripe_data: { subscriptionId: 'sub_123' },
      });
      jest.spyOn(stripeService.subscriptions, 'retrieve').mockResolvedValue(null);

      await expect(guard.canActivate(mockExecutionContext({ team_id }))).rejects.toThrow(
        new HttpException(
          { statusCode: HttpStatus.BAD_REQUEST, message: `Team with team_id: ${team_id} subscription not found` },
          HttpStatus.BAD_REQUEST,
        ),
      );
    });

    it('negative: should throw HttpException when subscription is not active', async () => {
      const team_id = '123';
      jest.spyOn(teamManagementService, 'getTeamById').mockResolvedValue({
        payment_type: PaymentType.STRIPE,
        stripe_data: { subscriptionId: 'sub_123' },
      });
      jest
        .spyOn(stripeService.subscriptions, 'retrieve')
        .mockResolvedValue({ ...dummyTeamSubscription, status: 'past_due' });

      await expect(guard.canActivate(mockExecutionContext({ team_id }))).rejects.toThrow(
        new HttpException(
          { statusCode: HttpStatus.PAYMENT_REQUIRED, message: 'The team does not have an active subscription!' },
          HttpStatus.PAYMENT_REQUIRED,
        ),
      );
    });

    it('positive: should return true when team has an active Stripe subscription', async () => {
      jest.spyOn(teamManagementService, 'getTeamById').mockResolvedValue({
        payment_type: PaymentType.STRIPE,
        stripe_data: { subscriptionId: 'sub_123' },
      });
      jest.spyOn(stripeService.subscriptions, 'retrieve').mockResolvedValue(dummyTeamSubscription);

      const result = await guard.canActivate(mockExecutionContext({ team_id: TeamWithMembersDummy.id }));
      expect(result).toBe(true);
    });

    it('positive: should return true when team use Offline as payment type', async () => {
      const team_id = '123';
      jest.spyOn(teamManagementService, 'getTeamById').mockResolvedValue({
        payment_type: PaymentType.OFFLINE,
      });

      const result = await guard.canActivate(mockExecutionContext({ team_id }));
      expect(result).toBe(true);
    });
  });
});
