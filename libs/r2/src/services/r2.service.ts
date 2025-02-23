import { Injectable, Inject } from '@nestjs/common';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { R2_MODULE_OPTIONS } from '../r2.constants';
import { IR2Options } from '../interfaces';
import { ONE_WEEK_IN_SECONDS } from '../../../../apps/api-server/src/shared/utils/constants';

@Injectable()
export class R2Service {
  private s3Client: S3Client;

  constructor(@Inject(R2_MODULE_OPTIONS) private readonly r2Options: IR2Options) {
    this.s3Client = new S3Client({ ...this.r2Options, region: this.r2Options.region || 'us-east-1' });
  }

  async getPresignedUrl(bucket: string, key: string) {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const url = await getSignedUrl(this.s3Client, command, { expiresIn: ONE_WEEK_IN_SECONDS });
    return url;
  }

  async addObjectToBucket(bucket: string, key: string, body: any) {
    const buf = Buffer.from(JSON.stringify(body));
    const objectData = {
      Bucket: bucket,
      Key: `${key}.json`,
      Body: buf,
      ContentEncoding: 'base64',
      ContentType: 'application/json',
      ContentDisposition: 'attachment',
    };

    const command = new PutObjectCommand(objectData);
    await this.s3Client.send(command);
  }

  async uploadFileToBucket(bucket: string, key: string, body: any, contentType: string) {
    const fileData = {
      Bucket: bucket,
      Body: body,
      Key: key,
      ContentType: contentType,
    };

    const command = new PutObjectCommand(fileData);
    await this.s3Client.send(command);
  }

  async getPresignedUploadUrl(bucket: string, key: string, contentType: string) {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    });

    try {
      const url = await getSignedUrl(this.s3Client, command, { expiresIn: ONE_WEEK_IN_SECONDS });
      return url;
    } catch (error) {
      throw new Error(`Could not get presigned URL: ${error.message}`);
    }
  }
}
