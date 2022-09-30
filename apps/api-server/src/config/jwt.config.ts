import { registerAs } from '@nestjs/config';
import { IJwtOptions } from '../../../../libs/jwt/src/interfaces';

export const tokensConfig = registerAs('tokens', (): { [key: string]: IJwtOptions } => ({
  invitation: {
    secret: process.env.JWT_INVITATION_SECRET,
    signOptions: {
      expiresIn: '7 days',
    },
  },
}));
