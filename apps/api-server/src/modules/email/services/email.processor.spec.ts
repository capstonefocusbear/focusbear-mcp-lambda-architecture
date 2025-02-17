import { Test, TestingModule } from '@nestjs/testing';
import { SendGridService } from '@app/send-grid';
import { Job } from 'bull';
import { EmailProcessor } from './email.processor';

describe('EmailProcessor', () => {
  let processor: EmailProcessor;
  let sendGridMock: Partial<SendGridService>;

  beforeEach(async () => {
    sendGridMock = {
      sendEmail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailProcessor,
        {
          provide: SendGridService,
          useValue: sendGridMock,
        },
      ],
    }).compile();

    processor = module.get<EmailProcessor>(EmailProcessor);
  });

  it('should call sendEmail when handling sendCancellationEmail jobs', async () => {
    const mockJobData = {
      to: 'zoho@desk.com',
      from: 'support@focusbear.io',
      replyTo: 'someuser@example.com',
      subject: 'User Unsubscribe Feedback',
      text: 'User ID: user-id-abc\n\nReason: Some reason...',
    };

    const mockJob = { data: mockJobData } as Job;

    await processor.handleSendEmail(mockJob);

    expect(sendGridMock.sendEmail).toHaveBeenCalledTimes(1);
    expect(sendGridMock.sendEmail).toHaveBeenCalledWith(mockJobData);
  });
});
