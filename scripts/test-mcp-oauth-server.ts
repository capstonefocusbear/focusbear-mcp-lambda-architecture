import 'dotenv/config';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { TypeOrmModule } from '@nestjs/typeorm';
import { typeormConfig } from '../libs/config/src/typeorm.config';
import { OAuthModule } from '../apps/api-server/src/modules/mcp-oauth/oauth.module';
import { loadOAuthConfig } from '../apps/api-server/src/modules/mcp-oauth/oauth.config';
import { registerOAuthFormParser } from '../apps/api-server/src/modules/mcp-oauth/oauth.form';

// Manual local integration harness: production routes/services/store against the
// normal migrated development database, without initializing unrelated modules.
// This is not a deployment entry point and does not expose task API routes.
async function main(): Promise<void> {
  const config = loadOAuthConfig();
  if (!config || config.issuer !== 'http://127.0.0.1:5038/' || process.env.NODE_ENV === 'production') {
    throw new Error('Enable MCP_OAUTH_ENABLED with the local issuer and a non-production environment');
  }
  if (!['127.0.0.1', 'localhost'].includes(process.env.POSTGRES_HOST || '')) {
    throw new Error('This test runner requires a local PostgreSQL host');
  }

  @Module({
    imports: [TypeOrmModule.forRoot({ ...typeormConfig(), logging: false }), OAuthModule],
  })
  class LocalOAuthTestModule {}

  const adapter = new FastifyAdapter();
  const app = await NestFactory.create<NestFastifyApplication>(LocalOAuthTestModule, adapter, {
    logger: ['error', 'warn'],
  });
  registerOAuthFormParser(adapter);
  app.enableShutdownHooks();
  await app.listen(5038, '127.0.0.1');
  process.stdout.write('Local OAuth test server running at http://127.0.0.1:5038/\n');
  process.stdout.write(
    'Uses the production OAuth implementation; requires existing users and OAuth migration tables.\n',
  );
}

main().catch(() => {
  process.stderr.write(
    'OAuth test server failed to start. Check local database availability, OAuth configuration, and migrations.\n',
  );
  process.exitCode = 1;
});
