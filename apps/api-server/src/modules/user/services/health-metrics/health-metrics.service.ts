import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HealthMetrics } from '../../entities/health-metrics.entity';
import { SyncHealthMetricsDto } from '../../dto/sync-health-metrics.dto';
import { StudyParticipant } from '../../entities/study-participant.entity';

@Injectable()
export class HealthMetricsService {
  constructor(
    @InjectRepository(HealthMetrics)
    private readonly healthMetricsRepository: Repository<HealthMetrics>,
    @InjectRepository(StudyParticipant)
    private readonly studyParticipantRepository: Repository<StudyParticipant>,
  ) {}

  async syncHealthMetrics(userId: string, syncDto: SyncHealthMetricsDto): Promise<void> {
    const { healthMetrics } = syncDto;

    await Promise.all(
      healthMetrics.map(async (item) => {
        const existingData = await this.healthMetricsRepository.findOne({
          where: {
            userId,
            metricType: item.metricType,
            dayOfTracking: item.dayOfTracking,
          },
        });

        if (existingData) {
          await this.healthMetricsRepository.update(existingData.id, {
            metricValue: item.metricValue,
          });
        } else {
          await this.healthMetricsRepository.save({ userId, ...item });
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
        healthDataLastReceived: new Date(),
      });
    }
  }
}
