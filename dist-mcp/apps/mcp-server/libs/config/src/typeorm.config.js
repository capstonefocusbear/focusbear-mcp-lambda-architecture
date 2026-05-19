"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.typeormConfig = void 0;
const config_1 = require("@nestjs/config");
const path_1 = require("path");
const all_entities_1 = require("./all-entities");
exports.typeormConfig = (0, config_1.registerAs)('typeorm', () => ({
    type: 'postgres',
    host: process.env.POSTGRES_HOST,
    port: Number(process.env.POSTGRES_PORT) || 5432,
    username: process.env.POSTGRES_USERNAME,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
    synchronize: false,
    logging: ['error', 'warn'],
    maxQueryExecutionTime: 200,
    ssl: process.env.NODE_ENV === 'development' ? false : (process.env.AWS_REGION ? { rejectUnauthorized: false } : false),
    migrationsTransactionMode: 'none',
    entities: all_entities_1.allEntities,
    migrations: [(0, path_1.join)(__dirname, '../../migrations/**/*.{ts,js}')],
}));
//# sourceMappingURL=typeorm.config.js.map