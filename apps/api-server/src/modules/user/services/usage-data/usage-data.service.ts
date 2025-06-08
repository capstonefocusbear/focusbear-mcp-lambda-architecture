import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsageData } from '../../entities/usage-data.entity';
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
}
