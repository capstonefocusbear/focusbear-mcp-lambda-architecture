import { Injectable } from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { R2Service } from '@app/r2';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { FileUploadRequest } from '../domain/upload.interface';

@Injectable()
export class AppLogsService {
  constructor(private readonly r2Service: R2Service, @InjectSentry() private readonly sentryService: SentryService) {}

  async uploadFile(request: FileUploadRequest, response: FastifyReply, user_id: string): Promise<any> {
    try {
      const fileData = await request.file();
      const fileBuffer = await fileData.toBuffer();
      await this.r2Service.uploadFileToBucket(
        'app-usage-logs',
        `${user_id}-${fileData.filename}`,
        fileBuffer,
        fileData.mimetype,
      );
      return await response.send('Upload successful!').status(201);
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
  }
}
