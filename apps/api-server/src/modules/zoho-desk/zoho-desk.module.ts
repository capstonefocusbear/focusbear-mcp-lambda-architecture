import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ZohoDeskService } from './services/zoho-desk.service';

@Module({
  imports: [ConfigModule],
  controllers: [],
  providers: [ZohoDeskService],
  exports: [ZohoDeskService],
})
export class ZohoDeskModule {}
