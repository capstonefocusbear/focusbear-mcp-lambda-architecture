import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SendGridService } from '@app/send-grid';
import { AccountabilityEmailService } from './accountability-email.service';
import { SendGridServiceMock } from '../../../../test/mocks';

describe('AccountabilityEmailService', () => {
  let service: AccountabilityEmailService;

  const frontEndUrl = 'https://app.example.com';
  const devFrontendUrl = 'https://dev.example.com';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [AccountabilityEmailService, SendGridService, ConfigService],
    })
      .overrideProvider(SendGridService)
      .useValue(SendGridServiceMock)
      .overrideProvider(ConfigService)
      .useValue({
        get: jest.fn((key: string) => {
          if (key === 'server.frontEndUrl') return frontEndUrl;
          if (key === 'server.devFrontendUrl') return devFrontendUrl;
          return undefined;
        }),
      })
      .compile();

    service = moduleRef.get<AccountabilityEmailService>(AccountabilityEmailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendBuddyInvitationEmail', () => {
    it('should send buddy invitation email with user name', async () => {
      const buddyEmail = 'buddy@example.com';
      const inviteUrl = 'https://app.example.com/accountability-buddy/accept?token=abc123';
      const userName = 'Test User';

      await service.sendBuddyInvitationEmail(buddyEmail, inviteUrl, userName);

      expect(SendGridServiceMock.sendEmail).toHaveBeenCalledWith({
        to: buddyEmail,
        from: expect.any(String),
        templateId: expect.any(String),
        dynamicTemplateData: {
          invite_url: inviteUrl,
          user_name: userName,
        },
        bcc: expect.any(String),
      });
    });

    it('should send buddy invitation email without user name', async () => {
      const buddyEmail = 'buddy@example.com';
      const inviteUrl = 'https://app.example.com/accountability-buddy/accept?token=abc123';

      await service.sendBuddyInvitationEmail(buddyEmail, inviteUrl);

      expect(SendGridServiceMock.sendEmail).toHaveBeenCalledWith({
        to: buddyEmail,
        from: expect.any(String),
        templateId: expect.any(String),
        dynamicTemplateData: {
          invite_url: inviteUrl,
          user_name: 'a Focus Bear user',
        },
        bcc: expect.any(String),
      });
    });
  });

  describe('sendUnlockRequestEmail', () => {
    it('should send unlock request email with reason', async () => {
      const buddyEmail = 'buddy@example.com';
      const approvalUrl = 'https://app.example.com/accountability-buddy/unlock-request/approve?token=abc123';
      const userName = 'Test User';
      const reason = 'Need to check urgent email';

      await service.sendUnlockRequestEmail(buddyEmail, approvalUrl, userName, reason);

      expect(SendGridServiceMock.sendEmail).toHaveBeenCalledWith({
        to: buddyEmail,
        from: expect.any(String),
        templateId: expect.any(String),
        dynamicTemplateData: {
          approval_url: approvalUrl,
          user_name: userName,
          reason,
        },
        bcc: expect.any(String),
      });
    });

    it('should send unlock request email without reason', async () => {
      const buddyEmail = 'buddy@example.com';
      const approvalUrl = 'https://app.example.com/accountability-buddy/unlock-request/approve?token=abc123';
      const userName = 'Test User';

      await service.sendUnlockRequestEmail(buddyEmail, approvalUrl, userName);

      expect(SendGridServiceMock.sendEmail).toHaveBeenCalledWith({
        to: buddyEmail,
        from: expect.any(String),
        templateId: expect.any(String),
        dynamicTemplateData: {
          approval_url: approvalUrl,
          user_name: userName,
          reason: 'No reason provided',
        },
        bcc: expect.any(String),
      });
    });
  });

  describe('sendUnlockRequestApprovedEmail', () => {
    it('should send unlock request approved email', async () => {
      const userEmail = 'user@example.com';

      await service.sendUnlockRequestApprovedEmail(userEmail);

      expect(SendGridServiceMock.sendEmail).toHaveBeenCalledWith({
        to: userEmail,
        from: expect.any(String),
        templateId: expect.any(String),
        bcc: expect.any(String),
      });
    });
  });

  describe('getFrontendBaseUrl', () => {
    it('should return frontEndUrl when origin is not devFrontendUrl', () => {
      const result = service.getFrontendBaseUrl('https://other.example.com');

      expect(result).toBe(frontEndUrl);
    });

    it('should return devFrontendUrl when origin matches devFrontendUrl', () => {
      const result = service.getFrontendBaseUrl(devFrontendUrl);

      expect(result).toBe(devFrontendUrl);
    });

    it('should return frontEndUrl when origin is undefined', () => {
      const result = service.getFrontendBaseUrl();

      expect(result).toBe(frontEndUrl);
    });
  });
});
