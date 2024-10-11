import { DataSource, DataSourceOptions } from 'typeorm';
import { runSeeders, SeederOptions } from 'typeorm-extension';
import { UserFactory } from './user.factory';
import { MainSeeder } from './main.seeder';
import { typeormConfig } from '../config/typeorm.config';
import { ActivityFactory } from './activity.factory';
import { DailyStatsFactory } from './daily-stats.factory';
import { ActivitySequenceFactory } from './activity-sequence.factory';
import { DeviceFactory } from './devices.factory';

const options: DataSourceOptions & SeederOptions = {
  ...typeormConfig(),
  factories: [UserFactory, ActivityFactory, DailyStatsFactory, ActivitySequenceFactory, DeviceFactory],
  seeds: [MainSeeder],
};

const datasource = new DataSource(options);
datasource.initialize().then(async () => {
  await runSeeders(datasource);
  process.exit();
});
