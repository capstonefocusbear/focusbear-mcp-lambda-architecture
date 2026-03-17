// biome-ignore-all lint/complexity/noBannedTypes: allow banned types in this file
import * as jwt from 'jsonwebtoken';

export interface IJwtService {
  asyncSign(
    payload: string | object | Buffer,
    secretOrPrivateKey: jwt.Secret,
    options: jwt.SignOptions,
  ): Promise<string>;

  asyncVerify<T extends object = any>(
    token: string,
    secretOrPublicKey: jwt.Secret | jwt.GetPublicKeyOrSecret,
    options: jwt.VerifyOptions & {
      complete: true;
    },
  ): Promise<T>;

  decode(token: string, options?: jwt.DecodeOptions): any;
}
