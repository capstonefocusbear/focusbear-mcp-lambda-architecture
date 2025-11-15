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
  accountability_buddy_invitation: {
    secret: process.env.ACCOUNTABILITY_BUDDY_INVITATION_SECRET,
    signOptions: {
      expiresIn: '7 days',
    },
  },
  unlock_request_approval: {
    secret: process.env.UNLOCK_REQUEST_APPROVAL_SECRET,
    signOptions: {
      expiresIn: '24 hours',
    },
  },
}));
