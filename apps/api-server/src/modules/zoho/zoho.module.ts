import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { ZohoService } from './services/zoho.service';
import { ZohoController } from './controllers/zoho.controller';

@Module({
  providers: [ZohoService],
  exports: [],
  imports: [UserModule],
  controllers: [ZohoController],
})
export class ZohoModule {}
