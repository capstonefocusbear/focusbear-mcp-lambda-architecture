import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { join } from 'path';
import { ActivitySequence } from '../modules/activity/entities/activity-sequence.entity';
import { Activity } from '../modules/activity/entities/activity.entity';
import { ComplitedActivity } from '../modules/activity/entities/complited-activity.entity';
import { User } from '../modules/user/entities/user.entity';

export const typeormConfig = registerAs(
  'typeorm',
  (): TypeOrmModuleOptions => ({
    type: 'postgres',
    host: process.env.POSTGRES_HOST,
    port: Number(process.env.POSTGRES_PORT) || 5432,
    username: process.env.POSTGRES_USERNAME,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
    synchronize: false,
    logging: true,
    entities: [User, Activity, ActivitySequence, ComplitedActivity],
    migrations: [join(__dirname, '../../migrations/**/*.{ts,js}'), join(__dirname, '../../seeds/**/*.{ts,js}')],
    cli: { migrationsDir: './apps/api-server/migrations' },
  }),
);
