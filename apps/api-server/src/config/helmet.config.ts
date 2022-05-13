import { registerAs } from '@nestjs/config';

export const helmetConfig = registerAs('helmet', (): unknown => ({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'validator.swagger.io'],
      scriptSrc: ["'self'", "https: 'unsafe-inline'"],
    },
  },
}));
