import { Logger, ValidationPipe, ValidationPipeOptions } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger as Pino, LoggerErrorInterceptor } from 'nestjs-pino';
import fastifyMultiPart = require('fastify-multipart');
import { AppModule } from './app.module';
import { TypeOrmExceptionFilter } from './shared/exceptions/type-orm-exception.filter';
import { AppDataSource } from '../ormconfig';
import { TimeoutInterceptor } from './shared/interceptors/timeout.interceptor';

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
  const fastifyAdapter: FastifyAdapter = new FastifyAdapter();

  const app = await NestFactory.create<NestFastifyApplication>(AppModule, fastifyAdapter, { rawBody: true });

  const configService: ConfigService = app.get(ConfigService);
  const PORT: string = configService.get('server.port');
  const HOST: string = configService.get('server.host');
  const HELMET: unknown = configService.get('helmet');
  const VALIDATION_PIPE: ValidationPipeOptions = configService.get('validation-pipe');

  app.useGlobalPipes(new ValidationPipe(VALIDATION_PIPE));
  app.useGlobalFilters(new TypeOrmExceptionFilter());
  app.useGlobalInterceptors(new LoggerErrorInterceptor());
  app.useGlobalInterceptors(new TimeoutInterceptor());
  // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
  await app.register(require('@fastify/helmet'), HELMET);
  // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
  app.register(require('@fastify/cors'));
  app.register(fastifyMultiPart);
  app.useLogger(app.get(Pino));

  AppDataSource.initialize()
    .then(() => {
      // eslint-disable-next-line no-console
      console.log('Connected to Data Source');
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error('Error during Data Source initialization', err);
    });

  const logger: Logger = new Logger('main.ts');

  bootstrapApiDocumentation(app);

  await app.listen(PORT, HOST);
  logger.log(`Server has been started on HOST: ${HOST}, PORT: ${PORT}`);
}

bootstrap();
