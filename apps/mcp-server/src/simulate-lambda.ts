import express from 'express';

const app = express();
app.use(express.json());

// 1. Mock the AWS Global 'awslambda' object FIRST
(global as any).awslambda = {
  streamifyResponse: (fn: any) => fn,
  HttpResponseStream: {
    from: (stream: any, metadata: any) => {
      // Set the SSE headers on the actual Express response object
      stream.writeHead(metadata.statusCode, metadata.headers);
      return stream;
    },
  },
};

// 2. Import the handler SECOND (Using require bypasses import hoisting)
// This ensures main.ts doesn't execute until AFTER global.awslambda exists.
const { handler } = require('./main');

app.post('/mcp', async (req, res) => {
  console.log('--- Simulating Lambda Trigger ---');

  // Create a mock 'event' object that looks like an ALB request
  const event = {
    headers: req.headers,
    body: JSON.stringify(req.body),
    requestContext: { elb: { targetGroupArn: 'mock-arn' } },
  };

  // Call your handler, passing 'res' as the 'responseStream'
  try {
    await handler(event, res, {});
  } catch (err) {
    console.error('Simulation Error:', err);
    res.end();
  }
});

const PORT = 5039;
app.listen(PORT, '0.0.0.0', () => {
  // Bind to 0.0.0.0 for Docker!
  console.log(`🚀 Local Lambda Simulator running at http://localhost:${PORT}/mcp`);
});
