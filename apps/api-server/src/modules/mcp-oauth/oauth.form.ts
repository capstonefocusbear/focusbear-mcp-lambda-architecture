import { HttpException } from '@nestjs/common';
import { FastifyAdapter } from '@nestjs/platform-fastify';

export function registerOAuthFormParser(adapter: FastifyAdapter): void {
  adapter.registerParserMiddleware('', true);
  const server = adapter.getInstance();
  server.removeContentTypeParser('application/x-www-form-urlencoded');
  server.addContentTypeParser(
    'application/x-www-form-urlencoded',
    { parseAs: 'string', bodyLimit: 16384 },
    (_req, body, done) => {
      const form = new URLSearchParams(body as string);
      const result: Record<string, string> = Object.create(null);
      for (const [key, value] of form) {
        if (Object.prototype.hasOwnProperty.call(result, key))
          return done(new HttpException({ error: 'invalid_request' }, 400));
        result[key] = value;
      }
      done(null, result);
    },
  );
}
