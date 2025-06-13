import { Controller, Body, UseGuards, Post } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { R2Service } from '@app/r2';
import { IsAuth } from '../../../auth/guards/is-auth/is-auth.guard';
import { AuthContext } from '../../../../shared/decorators/passport.decorator';
import { Passport } from '../../../auth/domain/passport.model';
import { SyncUsageDataDto } from '../../dto/sync-usage-data.dto';
import { UploadUsageImageDto } from '../../dto/upload-usage-image.dto';
import { BullQueues, BullWorkers, S3_BUCKET_USAGE_IMAGES } from '../../../../shared/utils/constants';

@Controller('usage-data')
@UseGuards(IsAuth)
export class UsageDataController {
  constructor(
    private readonly r2Service: R2Service,
    @InjectQueue(BullQueues.USAGE_IMAGE) private usageImageQueue: Queue,
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

  @Post('generate-upload-image-url')
  async generateUploadImageUrl(@AuthContext() { user }: Passport): Promise<{ uploadUrl: string; imageKey: string }> {
    const imageKey = `${user.id}-${Date.now()}-usage-image.png`;

    const uploadUrl = await this.r2Service.getPresignedUploadUrl(S3_BUCKET_USAGE_IMAGES, imageKey, 'image/png');

    return { uploadUrl, imageKey };
  }

  @Post('usage-image-uploaded')
  async uploadUsageImage(
    @Body() uploadUsageImageDto: UploadUsageImageDto,
    @AuthContext() { user }: Passport,
  ): Promise<void> {
    await this.usageImageQueue.add(
      BullWorkers.PROCESS_USAGE_IMAGE,
      {
        userId: user.id,
        imageKey: uploadUsageImageDto.imageKey,
        startDate: uploadUsageImageDto.usageStartDate,
        endDate: uploadUsageImageDto.usageEndDate,
        platform: uploadUsageImageDto.platform,
        deviceId: uploadUsageImageDto.deviceId,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    );
  }
}
