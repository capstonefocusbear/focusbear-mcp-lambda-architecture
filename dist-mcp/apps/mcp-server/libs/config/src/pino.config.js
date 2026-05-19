"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pinoConfig = void 0;
const config_1 = require("@nestjs/config");
const crypto_1 = require("crypto");
exports.pinoConfig = (0, config_1.registerAs)('pino', () => ({
    pinoHttp: {
        level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
        transport: process.env.NODE_ENV === 'development'
            ? {
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    levelFirst: true,
                    translateTime: true,
                },
            }
            : undefined,
        useLevelLabels: true,
        timestamp: () => `,"time":"${new Date(Date.now()).toISOString()}"`,
        autoLogging: process.env.NODE_ENV === 'development'
            ? true
            : {
                ignore: (req) => req.url === '/healthcheck',
            },
        redact: ['req.headers.authorization', 'req.headers.cookie'],
        serializers: {
            req(req) {
                var _a;
                return {
                    id: req.id,
                    method: req.method,
                    url: req.url,
                    path: (_a = req.raw) === null || _a === void 0 ? void 0 : _a.url,
                    headers: req.headers,
                };
            },
            res(res) {
                return {
                    statusCode: res.statusCode,
                    responseTime: res.responseTime,
                };
            },
        },
        genReqId(req) {
            return req.headers['x-request-id'] || (0, crypto_1.randomUUID)();
        },
    },
}));
//# sourceMappingURL=pino.config.js.map