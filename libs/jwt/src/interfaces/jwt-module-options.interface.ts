import * as jwt from 'jsonwebtoken';

export interface IJwtOptions {
  signOptions?: jwt.SignOptions;
  verifyOptions?: jwt.VerifyOptions & {
    complete: true;
  };
  secret?: jwt.Secret;
}
