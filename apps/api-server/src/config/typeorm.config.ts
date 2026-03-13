import { registerAs } from '@nestjs/config';
import { join } from 'path';
import { DataSourceOptions } from 'typeorm';
import { allEntities } from './all-entities';

export const typeormConfig = registerAs(
  'typeorm',
  (): DataSourceOptions => ({
    type: 'postgres',
    host: process.env.POSTGRES_HOST,
    port: Number(process.env.POSTGRES_PORT) || 5432,
    username: process.env.POSTGRES_USERNAME,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
    synchronize: false,
    logging: ['error', 'warn'],
    maxQueryExecutionTime: 200,
    ssl: { rejectUnauthorized: false },
    migrationsTransactionMode: 'none',
    entities: allEntities,
    migrations: [join(__dirname, '../../migrations/**/*.{ts,js}')],
  }),
);
