"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const platform_fastify_1 = require("@nestjs/platform-fastify");
const swagger_1 = require("@nestjs/swagger");
const nestjs_pino_1 = require("nestjs-pino");
const multipart_1 = require("@fastify/multipart");
const helmet_1 = require("@fastify/helmet");
const cors_1 = require("@fastify/cors");
const app_module_1 = require("./app.module");
function bootstrapApiDocumentation(app) {
    const config = new swagger_1.DocumentBuilder()
        .setTitle('API documentation')
        .addSecurity('Auth0AccessToken', { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
        .addSecurity('Auth0ActionSecret', { name: 'auth0_action_secret', type: 'apiKey', in: 'header' })
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('api', app, document);
}
async function bootstrap() {
    const fastifyAdapter = new platform_fastify_1.FastifyAdapter();
    const app = await core_1.NestFactory.create(app_module_1.AppModule, fastifyAdapter, { rawBody: true });
    const configService = app.get(config_1.ConfigService);
    const PORT = process.env.PORT || 5038;
    const HOST = '0.0.0.0';
    const HELMET = configService.get('helmet');
    const VALIDATION_PIPE = configService.get('validation-pipe');
    app.useGlobalPipes(new common_1.ValidationPipe(VALIDATION_PIPE));
    app.useGlobalInterceptors(new nestjs_pino_1.LoggerErrorInterceptor());
    await app.register(helmet_1.default, HELMET);
    await app.register(cors_1.default, { origin: '*', methods: ['*'] });
    app.register(multipart_1.default);
    app.useLogger(app.get(nestjs_pino_1.Logger));
    const logger = new common_1.Logger('main.ts');
    bootstrapApiDocumentation(app);
    await app.listen(PORT, HOST);
    logger.log(`Server has been tarted on HOST: ${HOST}, PORT: ${PORT}`);
}
bootstrap();
//# sourceMappingURL=main222.js.map