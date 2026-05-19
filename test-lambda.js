// test-lambda.js

// 1. Fake the AWS Global Environment
global.awslambda = {
  streamifyResponse: (handler) => handler,
  HttpResponseStream: {
    from: (stream) => stream, // Just pass the stream through
  },
};

const { handler } = require('./dist-mcp/apps/mcp-server/apps/mcp-server/src/main.js');

const { Writable } = require('stream');
const mockStream = new Writable({
  write(chunk, encoding, callback) {
    console.log(`[STREAM CHUNK]: ${chunk.toString().trim()}`);
    callback();
  },
});
/*
const mockEvent = {
  headers: {
    authorization: 'Bearer 3b375b842a5b12e95cf3dfe512476c6e1d1abea61aa17c07bb26f3700a5e7e05',
  },
  body: JSON.stringify({
    id: 'req_12345',
    method: 'tools/call', // <--- Giving it a real MCP method!
    params: {
      name: 'list_tasks',
      arguments: {},
    },
  }),
};*/

const mockEvent = {
  headers: {
    authorization: 'Bearer',
  },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 'req_12345',
    method: 'tools/call', // <--- Giving it a real MCP method!
    params: {
      name: 'list_tasks',
      arguments: {},
    },
  }),
};

// 5. Run the Lambda!
console.log('--- WAKING UP LAMBDA ---');
handler(mockEvent, mockStream, {})
  .then(() => console.log('\n--- LAMBDA FINISHED SUCCESSFULLY ---'))
  .catch((err) => console.error('\n--- LAMBDA CRASHED ---', err));
