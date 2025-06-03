/* eslint-disable no-console */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsageData } from '../../entities/usage-data.entity';
import { SyncUsageDataDto } from '../../dto/sync-usage-data.dto';

@Injectable()
export class UsageDataService {
  constructor(
    @InjectRepository(UsageData)
    private readonly usageDataRepository: Repository<UsageData>,
  ) {}

  async syncUsageData(userId: string, syncDto: SyncUsageDataDto): Promise<void> {
    const { usageData } = syncDto;

    await Promise.all(
      usageData.map(async (item) => {
        const existingData = await this.usageDataRepository.findOne({
          where: {
            userId,
            sourceName: item.sourceName,
            usageType: item.usageType,
            usageStartDate: item.usageStartDate,
            usageEndDate: item.usageEndDate,
          },
        });
        if (existingData) {
          await this.usageDataRepository.update(existingData.id, {
            minutesUsedTotal: item.minutesUsedTotal,
            minutesUsedDuringSleepWindow: item.minutesUsedDuringSleepWindow,
          });
        } else {
          await this.usageDataRepository.save({ userId, ...item });
        }
      }),
    );
  }
}
