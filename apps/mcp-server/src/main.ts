import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Context } from 'aws-lambda';
import { AppModule } from './app.module';
import { isJsonRpcNotification, McpService } from './mcp/mcp.service';

declare const awslambda: any;

// Cache the NestJS Context to prevent cold starts on every invocation
let appContext: any;
const logger = new Logger('LambdaBootstrap');

async function getAppContext() {
  if (!appContext) {
    logger.log('Cold Start: Initializing NestJS Application Context...');
    appContext = await NestFactory.createApplicationContext(AppModule);
  }
  return appContext;
}

export const handler = awslambda.streamifyResponse(async (event: any, responseStream: any, context: Context) => {
  // Parse the body first: notifications need a 202 status, so we must know before opening the stream.
  let body: any = {};
  let parseError = false;
  try {
    const rawBody = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
    body = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    parseError = true;
  }

  const metadata = {
    statusCode: isJsonRpcNotification(body) ? 202 : 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*', // Adjust for Focus Bear's actual domains
    },
  };

  responseStream = awslambda.HttpResponseStream.from(responseStream, metadata);

  try {
    if (parseError) {
      responseStream.write(
        `data: ${JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } })}\n\n`,
      );
      responseStream.end();
      return;
    }

    const app = await getAppContext();
    const userJwt = event.headers?.authorization || '';
    const mcpService = app.get(McpService);

    await mcpService.handleStreamRequest(body, userJwt, responseStream);
    responseStream.end();
  } catch (err) {
    logger.error('Fatal Lambda Error:', err);
    responseStream.write(
      `data: ${JSON.stringify({
        jsonrpc: '2.0',
        id: body?.id ?? null,
        error: { code: -32603, message: 'Internal Server Error' },
      })}\n\n`,
    );
    responseStream.end();
  }
});
