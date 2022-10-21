import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { join } from 'path';
import { ActivitySequence } from '../modules/activity/entities/activity-sequence.entity';
import { Activity } from '../modules/activity/entities/activity.entity';
import { CompletedActivitySequence } from '../modules/activity/entities/completed-activity-sequence.entity';
import { CompletedActivity } from '../modules/activity/entities/completed-activity.entity';
import { Device } from '../modules/device/entities/device.entity';
import { CompletedFocusBlock } from '../modules/focus-mode/entities/completed-focus-block.entity';
import { FocusMode } from '../modules/focus-mode/entities/focus-mode.entity';
import { Team } from '../modules/team/entities/team.entity';
import { User } from '../modules/user/entities/user.entity';
import { HabitPack } from '../modules/habit-pack/entity/habit-pack.entity';
import { InstalledPack } from '../modules/habit-pack/entity/installed-pack.entity';
import { ActivityTemplate } from '../modules/activity-template/entity/activity-template.entity';

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
    logging: false,
    entities: [
      User,
      Activity,
      ActivitySequence,
      CompletedActivity,
      Device,
      CompletedActivitySequence,
      FocusMode,
      CompletedFocusBlock,
      Team,
      HabitPack,
      InstalledPack,
      ActivityTemplate,
    ],
    migrations: [join(__dirname, '../../migrations/**/*.{ts,js}'), join(__dirname, '../../seeds/**/*.{ts,js}')],
    cli: { migrationsDir: './apps/api-server/migrations' },
  }),
);
