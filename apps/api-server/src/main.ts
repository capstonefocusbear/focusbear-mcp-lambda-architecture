import './instrument';
import './tracing';
import { Logger, ValidationPipe, ValidationPipeOptions } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger as Pino, LoggerErrorInterceptor } from 'nestjs-pino';
import { SentryGlobalFilter } from '@sentry/nestjs/setup';
import fastifyMultiPart from '@fastify/multipart';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import { AppModule } from './app.module';
import { TypeOrmExceptionFilter } from './shared/exceptions/type-orm-exception.filter';
import { AppDataSource } from '../ormconfig';
import { TimeoutInterceptor } from './shared/interceptors/timeout.interceptor';
import { BadGatewayExceptionFilter } from './shared/exceptions/badGatewayExceptionFilter';

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
  type RegisterParams = Parameters<typeof app.register>;

  const configService: ConfigService = app.get(ConfigService);
  const PORT = configService.get('server.port');
  const HOST: string = configService.get('server.host');
  const HELMET: unknown = configService.get('helmet');
  const VALIDATION_PIPE: ValidationPipeOptions = configService.get('validation-pipe');

  app.useGlobalFilters(new SentryGlobalFilter());
  app.useGlobalFilters(new BadGatewayExceptionFilter());
  app.useGlobalPipes(new ValidationPipe(VALIDATION_PIPE));
  app.useGlobalFilters(new TypeOrmExceptionFilter());
  app.useGlobalInterceptors(new LoggerErrorInterceptor());
  app.useGlobalInterceptors(new TimeoutInterceptor());

  // Align @fastify/* plugins with Nest's bundled Fastify types.
  await app.register(helmet as unknown as RegisterParams[0], HELMET as unknown as RegisterParams[1]);
  await app.register(
    cors as unknown as RegisterParams[0],
    { origin: '*', methods: ['*'] } as unknown as RegisterParams[1],
  );

  app.register(fastifyMultiPart as unknown as RegisterParams[0]);
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
