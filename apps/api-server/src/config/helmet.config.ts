import { registerAs } from '@nestjs/config';

export const helmetConfig = registerAs('helmet', (): unknown => ({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'", "'unsafe-inline'", '*.googleapis.com', '*.gstatic.com', 'cdn.jsdelivr.net'],
      // styleSrc: ["'self'", "'unsafe-inline'"],
      // imgSrc: ["'self'", 'data:', 'validator.swagger.io'],
      // scriptSrc: ["'self'", "https: 'unsafe-inline'"],
    },
  },
}));
