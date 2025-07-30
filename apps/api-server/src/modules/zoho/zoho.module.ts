import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ZohoService } from './services/zoho.service';
import { ZohoController } from './controllers/zoho.controller';

@Module({
  imports: [ConfigModule],
  controllers: [ZohoController],
  providers: [ZohoService],
  exports: [ZohoService],
})
export class ZohoModule {}
