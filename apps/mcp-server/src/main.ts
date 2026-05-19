import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { Context } from 'aws-lambda';
import { McpService } from './mcp/mcp.service'; // Adjust to your actual service name

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
  // 1. Establish the SSE Connection
  const metadata = {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/event-stream', // Open the SSE connection
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*', // Adjust for Focus Bear's actual domains
    },
  };

  responseStream = awslambda.HttpResponseStream.from(responseStream, metadata);

  try {
    // 2. Load the cached NestJS app
    const app = await getAppContext();

    // 3. Extract necessary data from the AWS ALB event
    const userJwt = event.headers['authorization'] || '';
    const body = event.body ? JSON.parse(event.body) : {};

    // 4. Send an initial "alive" ping to the client
    responseStream.write(`data: ${JSON.stringify({ status: 'Processing Request...' })}\n\n`);

    // 5. Execute your Business Logic
    // Retrieve your specific service from the NestJS DI container
    const mcpService = app.get(McpService);

    // Pass the stream object directly to your service so it can write to it
    await mcpService.handleStreamRequest(body, userJwt, responseStream);

    // 6. Gracefully close the connection when the service is done
    responseStream.end();
  } catch (err) {
    logger.error('Fatal Lambda Error:', err);
    responseStream.write(`data: ${JSON.stringify({ error: 'Internal Server Error' })}\n\n`);
    responseStream.end();
  }
});
