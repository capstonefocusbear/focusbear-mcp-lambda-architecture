import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class ScryptService {
  private SCRYPT_PARAMS = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

  private SCRYPT_PREFIX = '$scrypt$N=32768,r=8,p=1,maxmem=67108864$';

  private SALT_LEN = 32;

  private KEY_LEN = 64;

  async hash(string: string): Promise<string> {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(this.SALT_LEN, (err, salt) => {
        if (err) {
          reject(err);
          return;
        }
        crypto.scrypt(string, salt, this.KEY_LEN, this.SCRYPT_PARAMS, (error, hash) => {
          if (error) {
            reject(err);
            return;
          }
          resolve(this.serializeHash(hash, salt));
        });
      });
    });
  }

  private serializeHash(hash: Buffer, salt: Buffer): string {
    const saltString = salt.toString('base64').split('=')[0];
    const hashString = hash.toString('base64').split('=')[0];
    const serializedHash = `${this.SCRYPT_PREFIX}${saltString}$${hashString}`;
    return serializedHash;
  }

  async verify(string: string, serializedHash: string): Promise<boolean> {
    const { params, salt, hash } = this.deserializeHash(serializedHash);
    return new Promise((resolve, reject) => {
      const callback = (err, hashedString) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(crypto.timingSafeEqual(hashedString, hash));
      };
      crypto.scrypt(string, salt, hash.length, params, callback);
    });
  }

  private deserializeHash(phcString: string): any {
    const parsed = phcString.split('$');
    parsed.shift();
    const isUnsupportedAlgorithm = Boolean(parsed[0] !== 'scrypt');
    const unsupportedAlgorithmError = new Error('Node.js crypto supports only scrypt!');
    if (isUnsupportedAlgorithm) throw unsupportedAlgorithmError;
    const params = this.parseHashParams(parsed);
    const salt = Buffer.from(parsed[2], 'base64');
    const hash = Buffer.from(parsed[3], 'base64');
    return { params, salt, hash };
  }

  private parseHashParams(parsed: string[]): any {
    const paramsEntries = parsed[1].split(',').map((p) => {
      const [key, value] = p.split('=');
      return [key, Number(value)];
    });
    const params = Object.fromEntries(paramsEntries);
    return params;
  }
}
