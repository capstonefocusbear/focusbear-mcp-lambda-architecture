import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityModule } from '../activity/activity.module';
import { UserSettingsController } from './controllers/user-settings/user-settings.controller';
import { User } from './entities/user.entity';
import { UserRepository } from './repositories/user.repository';
import { UserSettingsService } from './services/user-settings/user-settings.service';

@Module({
  providers: [UserSettingsService, UserRepository],
  imports: [TypeOrmModule.forFeature([User]), ActivityModule],
  controllers: [UserSettingsController],
})
export class UserModule {}
