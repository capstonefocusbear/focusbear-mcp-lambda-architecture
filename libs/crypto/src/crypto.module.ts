import { Module } from '@nestjs/common';
import { ScryptService } from './services/scrypt.service';

@Module({
  providers: [ScryptService],
  exports: [ScryptService],
})
export class CryptoModule {}
