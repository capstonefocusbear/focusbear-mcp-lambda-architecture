import { BadRequestException, ValidationError, ValidationPipeOptions } from '@nestjs/common';
import { registerAs } from '@nestjs/config';

export const validationPipeConfig = registerAs(
  'validation-pipe',
  (): ValidationPipeOptions => ({
    whitelist: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
    forbidUnknownValues: false,
    exceptionFactory(errors: ValidationError[]) {
      return new BadRequestException(errors);
    },
  }),
);
