import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HabitPackController } from './controllers/habit-pack.controller';
import { HabitPackService } from './services/habit-pack/habit-pack.service';
import { HabitPackRepository } from './repositories/habit-pack.repository';
import { UserModule } from '../user/user.module';
import { ActivityTemplateModule } from '../activity-template/activty-template.module';
import { HabitPack } from './entity/habit-pack.entity';
import { HabitPackManagerService } from './services/habit-pack/habit-pack-manager.service';
import { InstalledPackService } from './services/installed-packs/installed-pack.service';
import { InstalledPack } from './entity/installed-pack.entity';
import { InstalledPackRepository } from './repositories/installed-pack.repository';
import { ActivityModule } from '../activity/activity.module';

@Module({
  providers: [
    HabitPackRepository,
    HabitPackService,
    HabitPackManagerService,
    InstalledPackService,
    InstalledPackRepository,
  ],
  imports: [
    TypeOrmModule.forFeature([HabitPack]),
    TypeOrmModule.forFeature([InstalledPack]),
    forwardRef(() => UserModule),
    forwardRef(() => ActivityTemplateModule),
    ActivityTemplateModule,
    ActivityModule,
  ],
  exports: [HabitPackService, HabitPackManagerService, HabitPackRepository],
  controllers: [HabitPackController],
})
export class HabitPackModule {}
