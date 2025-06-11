import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsageData, UsageType } from '../../entities/usage-data.entity';
import { SyncUsageDataDto } from '../../dto/sync-usage-data.dto';
import { StudyParticipant } from '../../entities/study-participant.entity';

@Injectable()
export class UsageDataService {
  constructor(
    @InjectRepository(UsageData)
    private readonly usageDataRepository: Repository<UsageData>,

    @InjectRepository(StudyParticipant)
    private readonly studyParticipantRepository: Repository<StudyParticipant>,
  ) {}

  async syncUsageData(userId: string, syncDto: SyncUsageDataDto): Promise<void> {
    const { usageData } = syncDto;

    const lastSync = await this.usageDataRepository.findOne({
      where: { userId },
      order: { updatedAt: 'DESC' },
    });

    if (lastSync?.updatedAt) {
      const lastSyncTime = new Date(lastSync.updatedAt);
      const now = new Date();
      const minutesSinceLastSync = (now.getTime() - lastSyncTime.getTime()) / (1000 * 60);

      if (minutesSinceLastSync < 10) {
        throw new BadRequestException(
          `Please wait ${Math.ceil(10 - minutesSinceLastSync)} minutes before syncing again.`,
        );
      }
    }

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

    const studyParticipant = await this.studyParticipantRepository.findOne({
      where: {
        userId,
      },
    });

    if (studyParticipant) {
      await this.studyParticipantRepository.update(studyParticipant.id, {
        usageDataLastReceived: new Date(),
      });
    }
  }

  async saveUsageData(
    userId: string,
    usageData: Array<{ sourceName: string; minutesUsedTotal: number; category: string }>,
    metadata: {
      startDate: Date;
      endDate: Date;
      platform?: string;
      deviceId?: string;
    },
  ): Promise<void> {
    await Promise.all(
      usageData.map(async (data) => {
        const existingData = await this.usageDataRepository.findOne({
          where: {
            userId,
            sourceName: data.sourceName,
            usageType: UsageType.APP,
            usageStartDate: metadata.startDate,
            usageEndDate: metadata.endDate,
          },
        });

        if (existingData) {
          await this.usageDataRepository.update(existingData.id, {
            minutesUsedTotal: data.minutesUsedTotal,
            minutesUsedDuringSleepWindow: 0,
          });
        } else {
          const entity = this.usageDataRepository.create({
            userId,
            sourceName: data.sourceName,
            usageType: UsageType.APP,
            usageCategory: data.category,
            usageStartDate: metadata.startDate,
            usageEndDate: metadata.endDate,
            minutesUsedTotal: data.minutesUsedTotal,
            minutesUsedDuringSleepWindow: 0,
            platform: metadata.platform,
            deviceId: metadata.deviceId,
          });
          await this.usageDataRepository.save(entity);
        }
      }),
    );
  }
}
