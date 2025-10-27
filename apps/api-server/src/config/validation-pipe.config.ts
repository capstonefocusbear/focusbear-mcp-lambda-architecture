import { BadRequestException, ValidationError, ValidationPipeOptions } from '@nestjs/common';
import { registerAs } from '@nestjs/config';

export const validationPipeConfig = registerAs(
  'validation-pipe',
  (): ValidationPipeOptions => ({
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
    whitelist: true, // Strip properties that don't have decorators - prevents property injection attacks
    forbidNonWhitelisted: true, // Throw error if non-whitelisted properties are present - prevents IDOR attacks
    forbidUnknownValues: false,
    exceptionFactory(errors: ValidationError[]) {
      return new BadRequestException(errors);
    },
  }),
);
