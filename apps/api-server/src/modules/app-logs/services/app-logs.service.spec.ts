import { Test } from '@nestjs/testing';
import { Auth0ManagementService } from '@app/auth0';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import { R2Service } from '@app/r2';
import { SendGridService } from '@app/send-grid';
import axios from 'axios';
import {
  Auth0ManagementServiceMock,
  R2ServiceMock,
  SendGridServiceMock,
  SentryServiceMock,
  UserRepositoryMock,
} from '../../../../test/mocks/index';
import { UserRepository } from '../../user/repositories/user.repository';
import { AppLogsService } from './app-logs.service';
import { auth0UserDummy, dummyNotifyLogsUploadSuccessDto, userDummy } from '../../../../test/dummies';

jest.mock('axios');

describe('AppLogsService', () => {
  let appLogsService: AppLogsService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AppLogsService,
        R2Service,
        Auth0ManagementService,
        UserRepository,
        SendGridService,
        {
          provide: SENTRY_TOKEN,
          useValue: SentryServiceMock,
        },
      ],
    })
      .overrideProvider(Auth0ManagementService)
      .useValue(Auth0ManagementServiceMock)
      .overrideProvider(R2Service)
      .useValue(R2ServiceMock)
      .overrideProvider(UserRepository)
      .useValue(UserRepositoryMock)
      .overrideProvider(SendGridService)
      .useValue(SendGridServiceMock)
      .compile();

    appLogsService = moduleRef.get<AppLogsService>(AppLogsService);
  });

  it('should be defined', () => {
    expect(appLogsService).toBeDefined();
  });

  describe('notifyLogsUploadSuccess', () => {
    it('positive: should send a successful request to Zoho Cliq', async () => {
      const expectedUrl = `${process.env.ZOHO_CLIQ_BACKEND_BOT_WEBHOOK}?zapikey=${process.env.ZOHO_CLIQ_API_KEY}`;
      const expectedBody = {
        channel: process.env.ZOHO_CLIQ_CUSTOMER_FEEDBACK_CHANNEL,
        message: `*Logs uploaded successfully*\n\n\`\`\`platform: ${dummyNotifyLogsUploadSuccessDto.app_platform} \n\nversion: ${dummyNotifyLogsUploadSuccessDto.app_version} \n\nfeedback_message: ${dummyNotifyLogsUploadSuccessDto.feedback_message}  \n\ndownload_url: log.txt\n \`\`\``,
      };

      (axios.post as jest.Mock).mockResolvedValue({ status: 200 });

      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userDummy);
      Auth0ManagementServiceMock.getAuth0User.mockResolvedValueOnce(auth0UserDummy);
      R2ServiceMock.getPresignedUrl.mockResolvedValueOnce('log.txt');

      await appLogsService.notifyLogsUploadSuccess(
        dummyNotifyLogsUploadSuccessDto,
        '3a4f0bb1-5313-49da-9ae6-cc28e864763f',
      );

      expect(axios.post).toHaveBeenCalledWith(expect.stringContaining(expectedUrl), expectedBody);
    });

    it('negative: should handle errors and log them to Sentry', async () => {
      let error;
      try {
        (axios.post as jest.Mock).mockRejectedValue('Server Error');
        await appLogsService.notifyLogsUploadSuccess(
          dummyNotifyLogsUploadSuccessDto,
          '9884b0af-dc9f-4207-964e-e4db537a2234',
        );
      } catch (err) {
        error = err;
      }

      expect(SentryServiceMock.instance().captureException).toHaveBeenCalledWith(error, {
        level: 'error',
      });
    });
  });
});
