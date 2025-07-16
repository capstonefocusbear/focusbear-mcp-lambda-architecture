import { Injectable, Inject } from '@nestjs/common';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
import { R2_MODULE_OPTIONS } from '../r2.constants';
import { IR2Options } from '../interfaces';
import { ONE_WEEK_IN_SECONDS } from '../../../../apps/api-server/src/shared/utils/constants';

@Injectable()
export class R2Service {
  private s3Client: S3Client;

  constructor(@Inject(R2_MODULE_OPTIONS) private readonly r2Options: IR2Options) {
    this.s3Client = new S3Client({
      region: this.r2Options.region || 'auto',
      endpoint: this.r2Options.endpoint,
      credentials: {
        accessKeyId: this.r2Options.accessKeyId,
        secretAccessKey: this.r2Options.secretAccessKey,
      },
    });
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

  async getJsonFromBucket(bucket: string, key: string): Promise<any> {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: `${key}.json`,
    });
    const response = await this.s3Client.send(command);

    // S3 returns a stream, so we need to read it fully
    const stream = response.Body as Readable;
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk as Buffer);
    }
    const data = Buffer.concat(chunks).toString('utf-8');
    return JSON.parse(data);
  }
}
