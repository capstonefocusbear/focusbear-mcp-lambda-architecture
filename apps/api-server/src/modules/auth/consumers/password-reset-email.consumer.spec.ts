import { SendGridService } from '@app/send-grid';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Job } from 'bull';
import { SentryServiceMock } from '../../../../test/mocks';
import { PasswordResetEmailConsumer, PasswordResetEmailJobData } from './password-reset-email.consumer';

describe('PasswordResetEmailConsumer', () => {
  const emailServiceMock = { sendEmail: jest.fn() } as unknown as SendGridService;
  const jwtServiceMock = { signAsync: jest.fn() } as unknown as JwtService;
  const configServiceMock = { get: jest.fn() } as unknown as ConfigService;

  let consumer: PasswordResetEmailConsumer;

  beforeEach(() => {
    jest.clearAllMocks();

    consumer = new PasswordResetEmailConsumer(
      SentryServiceMock as any,
      emailServiceMock,
      configServiceMock,
      jwtServiceMock,
    );
  });

  const makeJob = (overrides: Partial<Job<PasswordResetEmailJobData>> = {}) =>
    ({
      id: 1,
      attemptsMade: 0,
      opts: { attempts: 3 },
      data: {
        email: 'user@example.com',
        auth0_id: 'auth0|123',
        user_name: 'User',
        origin: undefined,
      },
      ...overrides,
    } as unknown as Job<PasswordResetEmailJobData>);

  it('sends email using frontEndUrl when origin does not match devFrontendUrl', async () => {
    (configServiceMock.get as any).mockImplementation((key: string) => {
      if (key === 'server.devFrontendUrl') return 'https://dev.focusbear.io';
      if (key === 'server.frontEndUrl') return 'https://dashboard.focusbear.io';
      return undefined;
    });

    (jwtServiceMock.signAsync as any).mockResolvedValue('a.b+c');
    (emailServiceMock.sendEmail as any).mockResolvedValue(undefined);

    const job = makeJob({ data: { ...makeJob().data, origin: 'https://something-else.com' } });
    await consumer.processPasswordResetEmail(job);

    expect(jwtServiceMock.signAsync).toHaveBeenCalledWith({
      email: job.data.email,
      auth0_id: job.data.auth0_id,
    });

    expect(emailServiceMock.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: job.data.email,
        dynamicTemplateData: expect.objectContaining({
          user_name: job.data.user_name,
          reset_link: `https://dashboard.focusbear.io/reset-password?token=${encodeURIComponent('a.b+c')}`,
          verification_link: `https://dashboard.focusbear.io/reset-password?token=${encodeURIComponent('a.b+c')}`,
        }),
      }),
    );
  });

  it('uses devFrontendUrl when origin matches configured devFrontendUrl', async () => {
    (configServiceMock.get as any).mockImplementation((key: string) => {
      if (key === 'server.devFrontendUrl') return 'https://dev.focusbear.io';
      if (key === 'server.frontEndUrl') return 'https://dashboard.focusbear.io';
      return undefined;
    });

    (jwtServiceMock.signAsync as any).mockResolvedValue('token');
    (emailServiceMock.sendEmail as any).mockResolvedValue(undefined);

    const job = makeJob({ data: { ...makeJob().data, origin: 'https://dev.focusbear.io' } });
    await consumer.processPasswordResetEmail(job);

    expect(emailServiceMock.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        dynamicTemplateData: expect.objectContaining({
          reset_link: 'https://dev.focusbear.io/reset-password?token=token',
        }),
      }),
    );
  });

  it('logs warning on retryable failure and error on final attempt', async () => {
    (configServiceMock.get as any).mockImplementation((key: string) => {
      if (key === 'server.frontEndUrl') return 'https://dashboard.focusbear.io';
      return undefined;
    });

    (jwtServiceMock.signAsync as any).mockResolvedValue('token');

    const retryableJob = makeJob({ attemptsMade: 0, opts: { attempts: 3 } as any });
    (emailServiceMock.sendEmail as any).mockRejectedValueOnce(new Error('send failed'));
    await expect(consumer.processPasswordResetEmail(retryableJob)).rejects.toThrow('send failed');
    expect(SentryServiceMock.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ level: 'warning' }),
    );

    const finalAttemptJob = makeJob({ attemptsMade: 2, opts: { attempts: 3 } as any });
    (emailServiceMock.sendEmail as any).mockRejectedValueOnce(new Error('send failed again'));
    await expect(consumer.processPasswordResetEmail(finalAttemptJob)).rejects.toThrow('send failed again');
    expect(SentryServiceMock.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ level: 'error' }),
    );
  });
});
