import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserSettingsController } from './controllers/user-settings/user-settings.controller';
import { User } from './entities/user.entity';
import { UserRepository } from './repositories/user.repository';
import { UserSettingsService } from './services/user-settings/user-settings.service';

@Module({
  providers: [UserSettingsService, UserRepository],
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UserSettingsController],
})
export class UserModule {}
