import { Module } from '@nestjs/common';
import { HelperCommonService } from './services/helper-common/helper-common.service';

@Module({
  providers: [HelperCommonService],
  exports: [HelperCommonService],
})
export class HelperModule {}
