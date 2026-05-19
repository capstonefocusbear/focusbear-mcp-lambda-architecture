"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
const mcp_service_1 = require("./mcp/mcp.service");
let appContext;
const logger = new common_1.Logger('LambdaBootstrap');
async function getAppContext() {
    if (!appContext) {
        logger.log('Cold Start: Initializing NestJS Application Context...');
        appContext = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
    }
    return appContext;
}
exports.handler = awslambda.streamifyResponse(async (event, responseStream, context) => {
    const metadata = {
        statusCode: 200,
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
            'Access-Control-Allow-Origin': '*',
        },
    };
    responseStream = awslambda.HttpResponseStream.from(responseStream, metadata);
    try {
        const app = await getAppContext();
        const userJwt = event.headers['authorization'] || '';
        const body = event.body ? JSON.parse(event.body) : {};
        responseStream.write(`data: ${JSON.stringify({ status: 'Processing Request...' })}\n\n`);
        const mcpService = app.get(mcp_service_1.McpService);
        await mcpService.handleStreamRequest(body, userJwt, responseStream);
        responseStream.end();
    }
    catch (err) {
        logger.error('Fatal Lambda Error:', err);
        responseStream.write(`data: ${JSON.stringify({ error: 'Internal Server Error' })}\n\n`);
        responseStream.end();
    }
});
//# sourceMappingURL=main.js.map