import { Test, TestingModule } from '@nestjs/testing';
import * as sendGrid from '@sendgrid/mail';
import { SendGridService } from './send-grid.service';
import { SEND_GRID_MODULE_OPTIONS } from './send-grid.constants';

jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: jest.fn().mockResolvedValue([{ statusCode: 202 }]),
}));

const mockSend = sendGrid.send as jest.Mock;

describe('SendGridService', () => {
  let service: SendGridService;

  beforeEach(async () => {
    mockSend.mockClear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SendGridService,
        {
          provide: SEND_GRID_MODULE_OPTIONS,
          useValue: { apiKey: 'test-api-key' },
        },
      ],
    }).compile();

    service = module.get<SendGridService>(SendGridService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendEmail', () => {
    it('should send email to regular addresses', async () => {
      const payload = {
        to: 'user@example.com',
        from: 'support@focusbear.io',
        subject: 'Test',
        text: 'Hello',
      };

      await service.sendEmail(payload);

      expect(mockSend).toHaveBeenCalledWith(payload, undefined);
    });

    it('should suppress email to internaltest@focusbear.io', async () => {
      const payload = {
        to: 'internaltest@focusbear.io',
        from: 'support@focusbear.io',
        subject: 'Test',
        text: 'Hello',
      };

      const result = await service.sendEmail(payload);

      expect(result).toBeUndefined();
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('should suppress email to internaltest+subaddress@focusbear.io', async () => {
      const payload = {
        to: 'internaltest+caltest1@focusbear.io',
        from: 'support@focusbear.io',
        subject: 'Progress Report',
        text: 'Hello',
      };

      const result = await service.sendEmail(payload);

      expect(result).toBeUndefined();
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('should suppress email when to is an object with test email', async () => {
      const payload = {
        to: { name: 'Test User', email: 'internaltest+user@focusbear.io' },
        from: 'support@focusbear.io',
        subject: 'Test',
        text: 'Hello',
      };

      const result = await service.sendEmail(payload);

      expect(result).toBeUndefined();
      expect(mockSend).not.toHaveBeenCalled();
    });

    it("should suppress email to addresses containing 'internaltest' at any domain (legacy includes check)", async () => {
      const payload = {
        to: 'internaltest@company.com',
        from: 'support@focusbear.io',
        subject: 'Test',
        text: 'Hello',
      };

      const result = await service.sendEmail(payload);

      expect(result).toBeUndefined();
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('should filter test recipients from mixed to arrays and still send', async () => {
      const payload = {
        to: ['user@example.com', 'internaltest+user@focusbear.io'],
        from: 'support@focusbear.io',
        subject: 'Test',
        text: 'Hello',
      };

      await service.sendEmail(payload);

      expect(mockSend).toHaveBeenCalledWith(
        {
          ...payload,
          to: ['user@example.com'],
        },
        undefined,
      );
    });

    it('should filter test recipients from bcc and still send', async () => {
      const payload = {
        to: 'user@example.com',
        from: 'support@focusbear.io',
        subject: 'Test',
        text: 'Hello',
        bcc: ['internaltest+owner@focusbear.io', 'ops@example.com'],
      };

      await service.sendEmail(payload);

      expect(mockSend).toHaveBeenCalledWith(
        {
          ...payload,
          bcc: ['ops@example.com'],
        },
        undefined,
      );
    });

    it('should skip payloads whose to recipients are fully filtered and still send remaining payloads', async () => {
      const payloads = [
        {
          to: 'internaltest@focusbear.io',
          from: 'support@focusbear.io',
          subject: 'Skip me',
          text: 'Hello',
        },
        {
          to: 'user@example.com',
          from: 'support@focusbear.io',
          subject: 'Send me',
          text: 'Hello',
        },
      ];

      await service.sendEmail(payloads, true);

      expect(mockSend).toHaveBeenCalledWith([payloads[1]], true);
    });

    it('should pass isMultiple parameter through', async () => {
      const payload = {
        to: 'user@example.com',
        from: 'support@focusbear.io',
        subject: 'Test',
        text: 'Hello',
      };

      await service.sendEmail(payload, true);

      expect(mockSend).toHaveBeenCalledWith(payload, true);
    });
  });
});
