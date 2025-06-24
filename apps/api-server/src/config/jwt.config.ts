import { registerAs } from '@nestjs/config';
import { IJwtOptions } from '@app/jwt/interfaces';

export const tokensConfig = registerAs('tokens', (): { [key: string]: IJwtOptions } => ({
  invitation: {
    secret: process.env.JWT_INVITATION_SECRET,
    signOptions: {
      expiresIn: '7 days',
    },
  },
  email_verification: {
    secret: process.env.EMAIL_VERIFICATION_SECRET,
    signOptions: {
      expiresIn: '7 days',
    },
  },
  password_reset: {
    secret: process.env.PASSWORD_RESET_SECRET,
    signOptions: {
      expiresIn: '7 days',
    },
  },
}));
