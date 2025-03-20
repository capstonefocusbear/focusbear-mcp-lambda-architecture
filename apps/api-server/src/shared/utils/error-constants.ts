import { ApiResponseOptions } from '@nestjs/swagger';

export const API_RESPONSE_EMAIL_NOT_VERIFIED: ApiResponseOptions = {
  status: 403,
  description: 'Email is not verified',
  schema: {
    example: {
      error: 'EMAIL_NOT_VERIFIED',
      message: 'You need to verify your email before proceeding.',
      statusCode: 403,
    },
  },
};

export const API_RESPONSE_THIRD_PARTY_EMAIL: ApiResponseOptions = {
  status: 400,
  description: 'Cannot reset password from a third-party email.',
  schema: {
    example: {
      error: 'THIRD_PARTY_EMAIL',
      message: 'Cannot reset password from a third-party email.',
      statusCode: 400,
    },
  },
};
