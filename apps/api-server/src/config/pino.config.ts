import { registerAs } from '@nestjs/config';

export const pinoConfig = registerAs('pino', () => ({
  pinoHttp: [
    {
      level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
      transport: process.env.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
      useLevelLabels: true,
      timestamp: () => `,"time":"${new Date(Date.now()).toISOString()}"`,
      autoLogging: process.env.NODE_ENV !== 'production',
    },
  ],

  prettyPrint: {
    colorize: true,
    levelFirst: true,
  },
}));
