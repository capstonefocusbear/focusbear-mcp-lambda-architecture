/* eslint-disable no-console */
import { Injectable } from '@nestjs/common';
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
    const entities = usageData.map((data) =>
      this.usageDataRepository.create({
        userId,
        sourceName: data.sourceName,
        usageType: UsageType.APP, // Default to APP
        usageCategory: data.category,
        usageStartDate: metadata.startDate,
        usageEndDate: metadata.endDate,
        minutesUsedTotal: data.minutesUsedTotal,
        minutesUsedDuringSleepWindow: 0, // Default to 0
        platform: metadata.platform,
        deviceId: metadata.deviceId,
      }),
    );

    await Promise.all(entities.map((entity) => this.usageDataRepository.save(entity)));
  }
}
