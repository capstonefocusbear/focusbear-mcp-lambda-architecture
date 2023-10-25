import { Injectable, Inject } from '@nestjs/common';
// eslint-disable-next-line import/extensions
import * as S3 from 'aws-sdk/clients/s3.js';
import { R2_MODULE_OPTIONS } from '../r2.constants';
import { IR2Options } from '../interfaces';

@Injectable()
export class R2Service {
  private s3: S3;

  constructor(@Inject(R2_MODULE_OPTIONS) private readonly r2Options: IR2Options) {
    this.s3 = new S3({ ...this.r2Options });
  }

  async getPresignedUrl(bucket: string, key: string) {
    const url = await this.s3.getSignedUrlPromise('getObject', {
      Bucket: bucket,
      Key: key,
      Expires: 604800,
    });
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
    await this.s3.upload(objectData).promise();
  }

  async uploadFileToBucket(bucket: string, key: string, body: any, contentType: string) {
    const fileData = {
      Bucket: bucket,
      Body: body,
      Key: key,
      ContentType: contentType,
    };
    await this.s3.upload(fileData).promise();
  }
}
