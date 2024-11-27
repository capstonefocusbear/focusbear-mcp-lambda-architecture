import { registerAs } from '@nestjs/config';
import { randomUUID } from 'crypto';

export const pinoConfig = registerAs('pino', () => ({
  pinoHttp: {
    level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
    transport:
      process.env.NODE_ENV === 'development'
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              levelFirst: true,
              translateTime: true,
            },
          }
        : undefined,
    useLevelLabels: true,
    timestamp: () => `,"time":"${new Date(Date.now()).toISOString()}"`,
    autoLogging: process.env.NODE_ENV === 'development',
    // remove sensitive data from logs
    redact: ['req.headers.authorization', 'req.headers.cookie'],
    // keep only the fields that are needed for logging
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url,
          headers: req.headers,
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
    genReqId(req) {
      return req.headers['x-request-id'] || randomUUID();
    },
  },
}));
