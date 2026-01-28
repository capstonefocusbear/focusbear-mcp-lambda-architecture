import { Test } from '@nestjs/testing';
import { Job } from 'bull';
import { SENTRY_TOKEN } from '@app/observability';
import { IsNull } from 'typeorm';
import { StripeService } from '@app/stripe';
import { StripeCustomerConsumer } from './stripe-customer.consumer';
import { UserRepository } from '../repositories/user.repository';
import { DeviceRepository } from '../../device/repositories/device.repository';
import { OperatingSystem } from '../../../shared/domain/operating-system.enum';
import { SentryServiceMock } from '../../../../test/mocks';

describe('StripeCustomerConsumer', () => {
  let consumer: StripeCustomerConsumer;

  const stripeServiceMock = {
    getStripeCustomerId: jest.fn(),
    registerNewCustomer: jest.fn(),
    deleteStripeCustomer: jest.fn(),
  };

  const userRepositoryMock = {
    orm: {
      findOneBy: jest.fn(),
      update: jest.fn(),
    },
  };

  const deviceRepositoryMock = {
    orm: {
      find: jest.fn(),
    },
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        StripeCustomerConsumer,
        { provide: StripeService, useValue: stripeServiceMock },
        { provide: UserRepository, useValue: userRepositoryMock },
        { provide: DeviceRepository, useValue: deviceRepositoryMock },
        { provide: SENTRY_TOKEN, useValue: SentryServiceMock },
      ],
    }).compile();

    consumer = moduleRef.get<StripeCustomerConsumer>(StripeCustomerConsumer);
    jest.clearAllMocks();
  });

  const buildJob = (
    overrides: Partial<{
      user_id: string;
      email: string;
      operating_system?: OperatingSystem;
    }> = {},
  ): Job<any> =>
    ({
      id: 'job-1',
      attemptsMade: 0,
      data: {
        user_id: 'user-1',
        email: 'user@example.com',
        operating_system: OperatingSystem.MacOS,
        ...overrides,
      },
    } as Job<any>);

  it('returns early when user is not found', async () => {
    userRepositoryMock.orm.findOneBy.mockResolvedValueOnce(null);

    await consumer.createStripeCustomer(buildJob());

    expect(stripeServiceMock.getStripeCustomerId).not.toHaveBeenCalled();
    expect(stripeServiceMock.registerNewCustomer).not.toHaveBeenCalled();
    expect(userRepositoryMock.orm.update).not.toHaveBeenCalled();
  });

  it('returns early when user already has stripe_customer_id', async () => {
    userRepositoryMock.orm.findOneBy.mockResolvedValueOnce({ id: 'user-1', stripe_customer_id: 'cus_existing' });

    await consumer.createStripeCustomer(buildJob());

    expect(stripeServiceMock.getStripeCustomerId).not.toHaveBeenCalled();
    expect(stripeServiceMock.registerNewCustomer).not.toHaveBeenCalled();
    expect(userRepositoryMock.orm.update).not.toHaveBeenCalled();
  });

  it('updates DB when Stripe customer exists by email and is not linked', async () => {
    userRepositoryMock.orm.findOneBy.mockResolvedValueOnce({ id: 'user-1', stripe_customer_id: null });
    stripeServiceMock.getStripeCustomerId.mockResolvedValueOnce('cus_found');
    userRepositoryMock.orm.findOneBy.mockResolvedValueOnce(null);
    userRepositoryMock.orm.update.mockResolvedValueOnce({ affected: 1 });

    await consumer.createStripeCustomer(buildJob({ operating_system: OperatingSystem.Unknown }));

    expect(userRepositoryMock.orm.update).toHaveBeenCalledWith(
      { id: 'user-1', stripe_customer_id: IsNull() },
      { stripe_customer_id: 'cus_found' },
    );
    expect(stripeServiceMock.registerNewCustomer).not.toHaveBeenCalled();
  });

  it('does not update DB when Stripe customer is already linked to another user', async () => {
    userRepositoryMock.orm.findOneBy.mockResolvedValueOnce({ id: 'user-1', stripe_customer_id: null });
    stripeServiceMock.getStripeCustomerId.mockResolvedValueOnce('cus_found');
    userRepositoryMock.orm.findOneBy.mockResolvedValueOnce({ id: 'user-2', stripe_customer_id: 'cus_found' });

    await consumer.createStripeCustomer(buildJob());

    expect(userRepositoryMock.orm.update).not.toHaveBeenCalled();
    expect(stripeServiceMock.registerNewCustomer).not.toHaveBeenCalled();
  });

  it('creates Stripe customer with idempotency key and updates DB when none exists', async () => {
    userRepositoryMock.orm.findOneBy.mockResolvedValueOnce({ id: 'user-1', stripe_customer_id: null });
    stripeServiceMock.getStripeCustomerId.mockResolvedValueOnce(null);
    stripeServiceMock.registerNewCustomer.mockResolvedValueOnce({ id: 'cus_new' });
    userRepositoryMock.orm.update.mockResolvedValueOnce({ affected: 1 });

    await consumer.createStripeCustomer(buildJob({ operating_system: OperatingSystem.MacOS }));

    expect(stripeServiceMock.registerNewCustomer).toHaveBeenCalledWith('user@example.com', OperatingSystem.MacOS, {
      idempotencyKey: 'stripe-customer-create:user-1',
      metadata: { user_id: 'user-1' },
    });
    expect(userRepositoryMock.orm.update).toHaveBeenCalledWith(
      { id: 'user-1', stripe_customer_id: IsNull() },
      { stripe_customer_id: 'cus_new' },
    );
  });

  it('deletes created Stripe customer if DB update loses the race and user has different stripe_customer_id', async () => {
    userRepositoryMock.orm.findOneBy.mockResolvedValueOnce({ id: 'user-1', stripe_customer_id: null });
    stripeServiceMock.getStripeCustomerId.mockResolvedValueOnce(null);
    stripeServiceMock.registerNewCustomer.mockResolvedValueOnce({ id: 'cus_new' });
    userRepositoryMock.orm.update.mockResolvedValueOnce({ affected: 0 });
    userRepositoryMock.orm.findOneBy.mockResolvedValueOnce({ id: 'user-1', stripe_customer_id: 'cus_other' });

    await consumer.createStripeCustomer(buildJob({ operating_system: OperatingSystem.MacOS }));

    expect(stripeServiceMock.deleteStripeCustomer).toHaveBeenCalledWith('cus_new');
  });

  it('rethrows errors to trigger Bull retry behavior', async () => {
    userRepositoryMock.orm.findOneBy.mockResolvedValueOnce({ id: 'user-1', stripe_customer_id: null });
    stripeServiceMock.getStripeCustomerId.mockRejectedValueOnce(new Error('stripe down'));

    await expect(consumer.createStripeCustomer(buildJob())).rejects.toThrow('stripe down');
  });
});
