import { BadRequestException, Injectable } from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { R2Service } from '@app/r2';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { Auth0ManagementService } from '@app/auth0';
import axios from 'axios';
import { FileUploadRequest } from '../domain/upload.interface';
import { UserRepository } from '../../user/repositories/user.repository';
import { UninstallFeedback } from '../domain/uninstall-feedback.model';

@Injectable()
export class AppLogsService {
  constructor(
    private readonly r2Service: R2Service,
    @InjectSentry() private readonly sentryService: SentryService,
    private readonly auth0ManagementService: Auth0ManagementService,
    private readonly userRepository: UserRepository,
  ) {}

  async uploadFile(request: FileUploadRequest, response: FastifyReply, user_id: string): Promise<any> {
    try {
      const user = await this.userRepository.orm.findOne({ where: { id: user_id } });
      const { app_platform, app_version, feedback_message } = request.query;
      const fileData = await request.file();
      // Validate that the file is a text file.
      if (fileData.mimetype !== 'text/plain') {
        throw new BadRequestException('Invalid file type. Please upload a .txt file.');
      }
      const fileBuffer = await fileData.toBuffer();
      await this.r2Service.uploadFileToBucket(
        'app-usage-logs',
        `${user_id}-${new Date().toISOString()}-${fileData.filename}`,
        fileBuffer,
        fileData.mimetype,
      );
      const presignedUrl = await this.r2Service.getPresignedUrl('app-usage-logs', `${user_id}-${fileData.filename}`);
      const auth0User = await this.auth0ManagementService.getAuth0User(user.auth0_id);
      const uninstallFeedback = new UninstallFeedback({
        app_platform,
        app_version,
        feedback_message,
        email: auth0User.email,
        log_url: presignedUrl,
      });
      await axios.post(process.env.SLACK_UNINSTALL_FEEDBACK_CHANNEL, {
        text: `*User feedback and app logs*\n\`\`\`${JSON.stringify(uninstallFeedback)}\`\`\``,
      });
      return await response.send('Upload successful!').status(201);
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
  }
}
