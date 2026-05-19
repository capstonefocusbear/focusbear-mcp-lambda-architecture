"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const app = (0, express_1.default)();
app.use(express_1.default.json());
global.awslambda = {
    streamifyResponse: (fn) => fn,
    HttpResponseStream: {
        from: (stream, metadata) => {
            stream.writeHead(metadata.statusCode, metadata.headers);
            return stream;
        },
    },
};
const { handler } = require('./main');
app.post('/mcp', async (req, res) => {
    console.log('--- Simulating Lambda Trigger ---');
    const event = {
        headers: req.headers,
        body: JSON.stringify(req.body),
        requestContext: { elb: { targetGroupArn: 'mock-arn' } },
    };
    try {
        await handler(event, res, {});
    }
    catch (err) {
        console.error('Simulation Error:', err);
        res.end();
    }
});
const PORT = 5039;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Local Lambda Simulator running at http://localhost:${PORT}/mcp`);
});
//# sourceMappingURL=simulate-lambda.js.map