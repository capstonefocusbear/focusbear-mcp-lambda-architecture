import { Logger, ValidationPipe, ValidationPipeOptions } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'fastify-helmet';
import { AppModule } from './app.module';

function bootstrapApiDocumentation(app: NestFastifyApplication): void {
  const config = new DocumentBuilder().setTitle('API documentation').build();
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
  app.register(helmet, HELMET);

  bootstrapApiDocumentation(app);

  await app.listen(PORT, HOST);
  logger.log(`Server has been started on HOST: ${HOST}, PORT: ${PORT}`);
}

bootstrap();
