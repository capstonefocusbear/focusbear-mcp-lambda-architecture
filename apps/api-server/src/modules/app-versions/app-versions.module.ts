import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppVersionsController } from './controllers/app-versions.controller';
import { AppVersionsService } from './services/app-versions.service';
import { AppVersionEntity } from './entities/app-versions.entity';
import { AppVersionsRepository } from './repositories/app-versions.repository';

@Module({
  imports: [TypeOrmModule.forFeature([AppVersionEntity])],
  providers: [AppVersionsService, AppVersionsRepository],
  controllers: [AppVersionsController],
  exports: [AppVersionsRepository, AppVersionsService],
})
export class AppVersionsModule {}
