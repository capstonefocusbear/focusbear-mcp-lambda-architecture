// biome-ignore-all lint/complexity/noBannedTypes: allow banned types in this file
import { Inject, Injectable } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { IJwtOptions, IJwtService } from './interfaces';
import { JWT_MODULE_OPTIONS } from './jwt.constants';

@Injectable()
export class JwtService implements IJwtService {
  constructor(@Inject(JWT_MODULE_OPTIONS) private jwtOptions: IJwtOptions) {}

  async asyncSign(
    payload: string | object | Buffer,
    secretOrPrivateKey: jwt.Secret = this.jwtOptions.secret,
    options: jwt.SignOptions = this.jwtOptions.signOptions,
  ): Promise<string> {
    return this.promiseAdapter<string>(jwt.sign, payload, secretOrPrivateKey, options);
  }

  private promiseAdapter<T>(func: Function, ...args: any): Promise<T> {
    return new Promise((resolve, reject) => {
      const promisify = (err, data) => (err ? reject(err) : resolve(data as T));
      func(...args, promisify);
    });
  }

  async asyncVerify<T extends object = any>(
    token: string,
    secretOrPublicKey: jwt.Secret | jwt.GetPublicKeyOrSecret = this.jwtOptions.secret,
    options: jwt.VerifyOptions & {
      complete: true;
    } = this.jwtOptions.verifyOptions,
  ): Promise<T> {
    return this.promiseAdapter<T>(jwt.verify, token, secretOrPublicKey, options);
  }

  decode(token: string, options?: jwt.DecodeOptions): any {
    return jwt.decode(token, options);
  }
}
