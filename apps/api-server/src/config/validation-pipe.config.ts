import { ValidationPipeOptions } from '@nestjs/common';
import { registerAs } from '@nestjs/config';

export const validationPipeCongif = registerAs(
  'validation-pipe',
  (): ValidationPipeOptions => ({
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
    forbidUnknownValues: false,
  }),
);
