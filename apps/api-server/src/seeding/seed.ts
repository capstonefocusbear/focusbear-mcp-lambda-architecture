import { DataSource, DataSourceOptions } from 'typeorm';
import { runSeeders, SeederOptions } from 'typeorm-extension';
import { UserFactory } from './user.factory';
import { MainSeeder } from './main.seeder';
import { typeormConfig } from '../config/typeorm.config';
import { ActivityFactory } from './activity.factory';
import { DailyStatsFactory } from './daily-stats.factory';
import { ActivitySequenceFactory } from './activity-sequence.factory';
import { DeviceFactory } from './devices.factory';
import { ActivityTemplateFactory } from './activity-template.factory';
import { ActivityTemplateTagFactory } from './activity-template-tag.factory';
import { CompletedFocusBlocksSeeder } from './completed-focus-blocks.seeder';
import { FocusModeFactory } from './focus-mode.factory';
import { FocusModeTagFactory } from './focus-mode-tag.factory';
import { CompletedFocusBlockFactory } from './completed-focus-block.factory';

const options: DataSourceOptions & SeederOptions = {
  ...typeormConfig(),
  factories: [
    UserFactory,
    ActivityFactory,
    DailyStatsFactory,
    ActivitySequenceFactory,
    DeviceFactory,
    ActivityTemplateFactory,
    ActivityTemplateTagFactory,
    FocusModeFactory,
    FocusModeTagFactory,
    CompletedFocusBlockFactory,
  ],
  seeds: [MainSeeder, CompletedFocusBlocksSeeder],
};

const datasource = new DataSource(options);
datasource.initialize().then(async () => {
  await runSeeders(datasource);
  process.exit();
});
