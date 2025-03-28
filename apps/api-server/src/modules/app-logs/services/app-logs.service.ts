import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { R2Service } from '@app/r2';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { Auth0ManagementService } from '@app/auth0';
import axios from 'axios';
import { SendGridService } from '@app/send-grid';
import { EMAIL_SUBJECTS, FOCUS_BEAR_EMAILS, S3_BUCKET_APP_USAGE_LOGS } from '../../../shared/utils/constants';
import { maskEmail } from '../../../shared/utils/helpers';
import { FileUploadRequest } from '../domain/upload.interface';
import { UserRepository } from '../../user/repositories/user.repository';
import { UninstallFeedback } from '../../user/domain/uninstall-feedback.model';
import { CreateUploadPresignedUrlQueryDto } from '../dto/create-upload-presigned-url-query.dto';
import { NotifyLogsUploadSuccess } from '../dto/notify-logs-upload-success.dto';

@Injectable()
export class AppLogsService {
  constructor(
    private readonly r2Service: R2Service,
    @InjectSentry() private readonly sentryService: SentryService,
    private readonly auth0ManagementService: Auth0ManagementService,
    private readonly userRepository: UserRepository,
    private readonly emailService: SendGridService,
  ) {}

  async uploadFile(request: FileUploadRequest, response: FastifyReply, user_id: string): Promise<any> {
    try {
      const user = await this.userRepository.orm.findOne({ where: { id: user_id } });
      const { app_platform, app_version, feedback_message } = request.query;
      const fileData = await request.file();
      // Validate that the file is a text file.
      if (fileData.mimetype !== 'text/plain' && fileData.mimetype !== 'application/zip') {
        throw new BadRequestException('Invalid file type. Please upload a .txt file.');
      }
      const fileBuffer = await fileData.toBuffer();
      const date = new Date().toISOString();
      await this.r2Service.uploadFileToBucket(
        S3_BUCKET_APP_USAGE_LOGS,
        `${user_id}-${date}-${fileData.filename}`,
        fileBuffer,
        fileData.mimetype,
      );
      const presignedUrl = await this.r2Service.getPresignedUrl(
        S3_BUCKET_APP_USAGE_LOGS,
        `${user_id}-${date}-${fileData.filename}`,
      );

      // TODO: Relocate this feature to a separate endpoint and ensure it is invoked exclusively when the app is uninstalled.
      const auth0User = await this.auth0ManagementService.getAuth0User(user.auth0_id);
      const uninstallFeedback = new UninstallFeedback({
        app_platform,
        app_version,
        feedback_message,
        email: maskEmail(auth0User.email),
        log_url: presignedUrl,
      });

      const cliqUrl = `${process.env.ZOHO_CLIQ_BACKEND_BOT_WEBHOOK}?zapikey=${process.env.ZOHO_CLIQ_API_KEY}`;
      // eslint-disable-next-line no-console
      console.log('upload logs cliq posting to', cliqUrl);
      const body = {
        channel: process.env.ZOHO_CLIQ_QUIT_UNINSTALL_CHANNEL,
        message: `*User feedback and app logs*\n\`\`\`${JSON.stringify(uninstallFeedback)}\`\`\``,
      };

      await Promise.all([
        axios.post(cliqUrl, body),
        this.emailFeedback(JSON.stringify(uninstallFeedback), auth0User.email),
      ]);
      return await response.send('Upload successful!').status(201);
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async emailFeedback(data: any, email: string) {
    if (email.includes('internaltest')) {
      return;
    }
    await this.emailService.sendEmail({
      to: [FOCUS_BEAR_EMAILS.ZOHO_DESK_SUPPORT],
      from: FOCUS_BEAR_EMAILS.SUPPORT,
      replyTo: email,
      text: JSON.stringify(data),
      subject: `${EMAIL_SUBJECTS.USER_FEEDBACK_AND_APP_LOGS}`,
    });
  }

  async createUploadPresignedUrl({ filename, mimetype }: CreateUploadPresignedUrlQueryDto, user_id: string) {
    const user = await this.userRepository.orm.findOneBy({ id: user_id });
    if (!user) {
      throw new NotFoundException(`User with id: ${user_id} does not exist!`);
    }
    const key = `${user_id}-${new Date().toISOString()}-${filename}`;
    const uploadURL = await this.r2Service.getPresignedUploadUrl(S3_BUCKET_APP_USAGE_LOGS, key, mimetype);
    return uploadURL;
  }

  async notifyLogsUploadSuccess({ uploaded_file_url }: NotifyLogsUploadSuccess) {
    try {
      const cliqUrl = `${process.env.ZOHO_CLIQ_BACKEND_BOT_WEBHOOK}?zapikey=${process.env.ZOHO_CLIQ_API_KEY}`;
      const body = {
        channel: process.env.ZOHO_CLIQ_QUIT_UNINSTALL_CHANNEL,
        message: `*User app logs*\n\`\`\`url:${uploaded_file_url}\`\`\``,
      };
      return await axios.post(cliqUrl, body);
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }
}
