import { Module } from '@nestjs/common';
import { TabKeywordsController } from './controllers/tab-keywords.controller';
import { TabKeywordsService } from './services/tab-keywords.service';

@Module({
  providers: [TabKeywordsService],
  controllers: [TabKeywordsController],
})
export class TabKeywordsModule {}
