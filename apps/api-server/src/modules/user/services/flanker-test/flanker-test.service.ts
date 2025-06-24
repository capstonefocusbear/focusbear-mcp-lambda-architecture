import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { FlankerTest } from '../../entities/flanker-test.entity';
import { StudyParticipant } from '../../entities/study-participant.entity';
import { SaveFlankerTestResultDto } from '../../dto/study-participant/save-flanker-test-result.dto';

@Injectable()
export class FlankerTestService {
  constructor(
    @InjectRepository(StudyParticipant)
    private readonly studyParticipantRepository: Repository<StudyParticipant>,
    private readonly dataSource: DataSource,
  ) {}

  async saveFlankerTestResult(userId: string, result: SaveFlankerTestResultDto): Promise<void> {
    const studyParticipant = await this.studyParticipantRepository.findOne({
      where: { userId },
    });

    if (!studyParticipant) {
      throw new NotFoundException('Study participant not found');
    }

    const flankerTest = new FlankerTest();
    Object.assign(flankerTest, {
      studyParticipantId: studyParticipant.id,
      ...result,
    });

    const flankerEffect = result.meanRtIncongruent - result.meanRtCongruent;

    await this.dataSource.transaction(async (transactionalEntityManager) => {
      await transactionalEntityManager.save(FlankerTest, flankerTest);
      if (result.isEndOfStudy) {
        await transactionalEntityManager.update(
          StudyParticipant,
          { id: studyParticipant.id },
          { afterStudyFlankerEffect: flankerEffect },
        );
      } else {
        await transactionalEntityManager.update(StudyParticipant, { id: studyParticipant.id }, { flankerEffect });
      }
    });
  }
}
