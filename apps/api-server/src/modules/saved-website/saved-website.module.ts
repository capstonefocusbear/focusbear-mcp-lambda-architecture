import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { SavedWebsiteRepository } from './repositories/saved-website.repository';
import { SavedWebsiteService } from './services/saved-website.service';
import { SavedWebsiteController } from './controllers/saved-website.controller';

@Module({
  providers: [SavedWebsiteRepository, SavedWebsiteService],
  controllers: [SavedWebsiteController],
  imports: [UserModule],
})
export class SavedWebsiteModule {}
