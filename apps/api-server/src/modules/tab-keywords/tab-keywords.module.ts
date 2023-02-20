import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { TabKeywordsController } from './controllers/tab-keywords.controller';
import { TabKeywordsService } from './services/tab-keywords.service';

@Module({
  providers: [TabKeywordsService],
  controllers: [TabKeywordsController],
  imports: [UserModule],
})
export class TabKeywordsModule {}
