import { Injectable, Inject } from '@nestjs/common';
// eslint-disable-next-line import/extensions
import * as S3 from 'aws-sdk/clients/s3.js';
import { R2_MODULE_OPTIONS } from '../r2.constants';
import { IR2Options } from '../interfaces';

@Injectable()
export class R2Service {
  constructor(@Inject(R2_MODULE_OPTIONS) private readonly r2Options: IR2Options) {}

  async getPresignedUrl(bucket: string, key: string) {
    const s3 = new S3({ ...this.r2Options });
    const url = await s3.getSignedUrlPromise('getObject', {
      Bucket: bucket,
      Key: key,
      Expires: 86400,
    });
    return url;
  }
}
