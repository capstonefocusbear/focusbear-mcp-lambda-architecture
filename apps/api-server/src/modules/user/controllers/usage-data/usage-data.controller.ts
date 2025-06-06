import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { IsAuth } from '@api-server/modules/auth/guards/is-auth/is-auth.guard';
import { AuthContext } from '@api-server/shared/decorators/passport.decorator';
import { Passport } from '@api-server/modules/auth/domain/passport.model';
import { SyncUsageDataDto } from '../../dto/sync-usage-data.dto';
import { BullQueues, BullWorkers } from '../../../../shared/utils/constants';

@Controller('usage-data')
@UseGuards(IsAuth)
export class UsageDataController {
  constructor(
    @InjectQueue(BullQueues.USAGE_DATA)
    private readonly usageDataQueue: Queue,
  ) {}

  @Post('sync')
  async syncUsageData(@Body() syncDto: SyncUsageDataDto, @AuthContext() { user }: Passport): Promise<void> {
    await this.usageDataQueue.add(BullWorkers.SYNC_USAGE_DATA, {
      userId: user.id,
      syncDto,
    });
  }
}
