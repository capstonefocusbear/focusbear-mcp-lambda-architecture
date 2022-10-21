import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HabitPackController } from './controllers/habit-pack.controller';
import { HabitPackService } from './services/habit-pack/habit-pack.service';
import { HabitPackRepository } from './repositories/habit-pack.repository';
import { UserModule } from '../user/user.module';
import { ActivityTemplateModule } from '../activity-template/activty-template.module';
import { HabitPack } from './entity/habit-pack.entity';
import { HabitPackManagerService } from './services/habit-pack/habit-pack-manager.service';
import { UserSettingsService } from '../user/services/user-settings/user-settings.service';
import { ActivityParserService } from '../activity/services/activity-parser/activity-parser.service';
import { ActivitySequenceRepository } from '../activity/repositories/activity-sequence.repository';
import { InstalledPackService } from './services/installed-packs/installed-pack.service';
import { InstalledPack } from './entity/installed-pack.entity';
import { InstalledPackRepository } from './repositories/installed-pack.repository';
import { ActivityTemplateRepository } from '../activity-template/repository/activity-template.repository';
import { ActivityRepository } from '../activity/repositories/activity.repository';

@Module({
  providers: [
    HabitPackRepository,
    HabitPackService,
    HabitPackManagerService,
    UserSettingsService,
    ActivityParserService,
    ActivitySequenceRepository,
    ActivityTemplateRepository,
    InstalledPackService,
    InstalledPackRepository,
    ActivityRepository,
  ],
  imports: [
    TypeOrmModule.forFeature([HabitPack]),
    TypeOrmModule.forFeature([InstalledPack]),
    forwardRef(() => UserModule),
    forwardRef(() => ActivityTemplateModule),
  ],
  controllers: [HabitPackController],
})
export class HabitPackModule {}
