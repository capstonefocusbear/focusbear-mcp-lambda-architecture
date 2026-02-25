import { DataSource } from 'typeorm';
import { allEntities } from '../apps/api-server/src/config/all-entities';

export const CronJobDataSource = new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST,
  port: Number(process.env.POSTGRES_PORT) || 5432,
  username: process.env.POSTGRES_USERNAME,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  synchronize: false,
  logging: true,
  entities: allEntities,
  subscribers: [],
  migrations: [],
  ssl: process.env.AWS_REGION ? { rejectUnauthorized: false } : false,
});
