import { Logger, ValidationPipe, ValidationPipeOptions } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'fastify-helmet';
import fastifyRawBody from 'fastify-raw-body';
import { AppModule } from './app.module';
import { TypeOrmExceptionFilter } from './shared/exceptions/type-orm-exception.filter';

function bootstrapApiDocumentation(app: NestFastifyApplication): void {
  const config = new DocumentBuilder()
    .setTitle('API documentation')
    .addSecurity('Auth0AccessToken', { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
    .addSecurity('Auth0ActionSecret', { name: 'auth0_action_secret', type: 'apiKey', in: 'header' })
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
}

async function bootstrap(): Promise<void> {
  const logger: Logger = new Logger('main.ts');

  const fastifyAdapter: FastifyAdapter = new FastifyAdapter();

  const app = await NestFactory.create<NestFastifyApplication>(AppModule, fastifyAdapter);

  const configService: ConfigService = app.get(ConfigService);
  const PORT: string = configService.get('server.port');
  const HOST: string = configService.get('server.host');
  const HELMET: unknown = configService.get('helmet');
  const VALIDATION_PIPE: ValidationPipeOptions = configService.get('validation-pipe');

  app.useGlobalPipes(new ValidationPipe(VALIDATION_PIPE));
  app.useGlobalFilters(new TypeOrmExceptionFilter());
  app.register(helmet, HELMET);
  app.register(fastifyRawBody, { global: true }); // turn off global and set route spesific // routes: ['/subscription/webhooks/stripe']

  bootstrapApiDocumentation(app);

  await app.listen(PORT, HOST);
  logger.log(`Server has been started on HOST: ${HOST}, PORT: ${PORT}`);
}

bootstrap();
