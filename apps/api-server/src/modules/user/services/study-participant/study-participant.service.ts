/* eslint-disable no-console */
import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SendGridService } from '@app/send-grid';
import { Auth0ManagementService } from '@app/auth0';
import { I18nService } from 'nestjs-i18n';
import { FOCUS_BEAR_EMAILS } from '../../../../shared/utils/constants';
import { User } from '../../entities/user.entity';
import { AppActivationStatus, StudyParticipant } from '../../entities/study-participant.entity';
import {
  AddParticipantDetailsDto,
  LinkUserToParticipantCodeDto,
  ParticipantCodeResponseDto,
} from '../../dto/study-participant';
import { FlankerTestService } from '../flanker-test/flanker-test.service';
import { SaveFlankerTestResultDto } from '../../dto/study-participant/save-flanker-test-result.dto';
import { StudyGroup } from '../../domain/study-groups.enum';

@Injectable()
export class StudyParticipantService {
  constructor(
    @InjectRepository(StudyParticipant)
    private readonly studyParticipantRepository: Repository<StudyParticipant>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly sendGridService: SendGridService,
    private readonly auth0ManagementService: Auth0ManagementService,
    private readonly flankerTestService: FlankerTestService,
    private readonly i18nService: I18nService,
  ) {}

  private async assignParticipantToGroup(dto: AddParticipantDetailsDto): Promise<StudyGroup> {
    const { mobileOS, yearLevel, faculty } = dto.metadata || {};

    if (!mobileOS || !yearLevel || !faculty) {
      throw new BadRequestException(
        'Mobile operating system, year level, and faculty of enrollment are required in metadata',
      );
    }

    // First, get overall group counts to ensure basic balance
    const overallGroupCounts = await Promise.all(
      Object.values(StudyGroup).map(async (group) => {
        const count = await this.studyParticipantRepository.count({
          where: { assignedGroup: group },
        });
        return { group, count };
      }),
    );

    // Find the group with the lowest overall count
    const minOverallGroup = overallGroupCounts.reduce((min, current) => (current.count < min.count ? current : min));

    // If the difference between groups is small (within 10 participants), use characteristic-based assignment
    const maxCount = Math.max(...overallGroupCounts.map((g) => g.count));
    const minCount = Math.min(...overallGroupCounts.map((g) => g.count));

    if (maxCount - minCount <= 10) {
      // Use characteristic-based assignment for better distribution across variables
      const characteristicGroupCounts = await Promise.all(
        Object.values(StudyGroup).map(async (group) => {
          const count = await this.studyParticipantRepository
            .createQueryBuilder('participant')
            .where('participant.assignedGroup = :group', { group })
            .andWhere("participant.metadata->>'mobileOS' = :mobileOS", { mobileOS })
            .andWhere("participant.metadata->>'yearLevel' = :yearLevel", { yearLevel })
            .andWhere("participant.metadata->>'faculty' = :faculty", { faculty })
            .getCount();
          return { group, count };
        }),
      );

      // Find the group with the lowest count for this specific combination
      // eslint-disable-next-line no-confusing-arrow
      const minCharacteristicGroup = characteristicGroupCounts.reduce((min, current) =>
        current.count < min.count ? current : min,
      );
      return minCharacteristicGroup.group as StudyGroup;
    }

    // Use overall balance to prevent one group from getting too large
    return minOverallGroup.group as StudyGroup;
  }

  async addParticipantDetails(dto: AddParticipantDetailsDto): Promise<void> {
    let participantCode = Math.random().toString(36).substring(2, 8);

    if (!dto.email.endsWith('@catolica.edu.sv') && !dto.email.endsWith('@focusbear.io')) {
      throw new BadRequestException('Email must be a valid Catolica email');
    } else if (dto.email.endsWith('@focusbear.io')) {
      const [, extractedCode] = dto.email.match(/internaltest\+unicaes_([a-zA-Z0-9]{6})@focusbear\.io/) || [];

      if (extractedCode) {
        participantCode = extractedCode;
      }
    }

    const allParticipants = await this.studyParticipantRepository.find();
    const existingParticipant = allParticipants.find((p) => p.email === dto.email);

    if (existingParticipant) {
      throw new ConflictException('Email already exists registered for the study');
    }

    const assignedGroup = await this.assignParticipantToGroup(dto);

    const participant = new StudyParticipant();

    Object.assign(participant, {
      ...dto,
      participantCode,
      assignedGroup,
      phoneNumber: dto?.phoneNumber || '',
      optedOut: dto?.whatsappConsent,
    });

    await this.studyParticipantRepository.save(participant);

    // Determine language for email
    const lang = dto.lang === 'en' ? 'en' : 'es';
    const subject = await this.i18nService.translate('common.study_participant_email_subject', { lang });
    const text = await this.i18nService.translate('common.study_participant_email_body', {
      lang,
      args: { code: participantCode },
    });

    await this.sendGridService.sendEmail({
      from: FOCUS_BEAR_EMAILS.SUPPORT,
      to: dto.email,
      replyTo: FOCUS_BEAR_EMAILS.SUPPORT,
      subject,
      html: text,
    });
  }

  async verifyParticipantCode(participantCode: string): Promise<ParticipantCodeResponseDto> {
    const participant = await this.studyParticipantRepository.findOne({
      where: { participantCode },
    });

    if (!participant) {
      throw new NotFoundException('Participant code not found');
    }

    let { email } = participant;

    if (participant.userId && !email) {
      const user = await this.userRepository.findOneBy({ id: participant.userId });
      const auth0User = await this.auth0ManagementService.getAuth0User(user.auth0_id);
      email = auth0User.email;
    }

    return {
      email,
      userId: participant.userId,
    };
  }

  async linkUserToParticipantCode(dto: LinkUserToParticipantCodeDto, userId: string): Promise<{ user_id: string }> {
    const participant = await this.studyParticipantRepository.findOne({
      where: { participantCode: dto.participantCode },
    });

    if (!participant) {
      throw new NotFoundException('Participant code not found');
    }

    if (participant.userId) {
      if (participant.userId === userId) {
        return {
          user_id: userId,
        };
      }
      throw new ConflictException('Participant code already linked to a different user');
    }

    const user = await this.userRepository.findOneBy({ id: userId });
    const auth0User = await this.auth0ManagementService.getAuth0User(user.auth0_id);

    if (participant.email !== auth0User.email) {
      throw new ConflictException(
        "The participant code doesn't match your email address. Please contact support@focusbear.io",
      );
    }

    await this.studyParticipantRepository.update({ participantCode: dto.participantCode }, { userId, email: null });

    return {
      user_id: userId,
    };
  }

  async getCodeActivationStatus(participantCode: string): Promise<AppActivationStatus> {
    const participant = await this.studyParticipantRepository.findOne({
      where: { participantCode },
    });

    if (!participant) {
      throw new NotFoundException('Participant code not found');
    }

    return participant.appActivationStatus;
  }

  async getParticipantLastReceivedData(userId: string): Promise<{
    healthDataLastReceived: Date;
    usageDataLastReceived: Date;
  }> {
    const participant = await this.studyParticipantRepository.findOne({
      where: { userId },
    });

    if (!participant) {
      throw new NotFoundException('Participant not found');
    }

    return {
      healthDataLastReceived: participant?.healthDataLastReceived,
      usageDataLastReceived: participant?.usageDataLastReceived,
    };
  }

  async markCompleteQuestionnaire(userId: string): Promise<void> {
    await this.studyParticipantRepository.update({ userId }, { isQuestionnaireCompleted: true });
  }

  async saveFlankerTestResult(userId: string, result: SaveFlankerTestResultDto): Promise<void> {
    await this.flankerTestService.saveFlankerTestResult(userId, result);
  }

  async markEndOfStudyQuestionnaireCompleted(userId: string): Promise<void> {
    await this.studyParticipantRepository.update({ userId }, { isEndOfStudyQuestionnaireCompleted: true });
  }

  async getGroupStatistics(): Promise<{
    totalParticipants: number;
    groupCounts: Record<StudyGroup, number>;
    groupDistributionByCharacteristics: {
      mobileOS: Record<string, Record<StudyGroup, number>>;
      yearLevel: Record<string, Record<StudyGroup, number>>;
      faculty: Record<string, Record<StudyGroup, number>>;
    };
  }> {
    const totalParticipants = await this.studyParticipantRepository.count();

    const groupCounts = await Promise.all(
      Object.values(StudyGroup).map(async (group) => {
        const count = await this.studyParticipantRepository.count({
          where: { assignedGroup: group },
        });
        return { group, count };
      }),
    );

    const mobileOSDistribution = await this.studyParticipantRepository
      .createQueryBuilder('participant')
      .select([
        'participant.metadata->>\'mobileOS\' as "mobileOS"',
        'participant.assignedGroup as group',
        'COUNT(*) as count',
      ])
      .where("participant.metadata->>'mobileOS' IS NOT NULL")
      .groupBy("participant.metadata->>'mobileOS'")
      .addGroupBy('participant.assignedGroup')
      .getRawMany();

    const yearLevelDistribution = await this.studyParticipantRepository
      .createQueryBuilder('participant')
      .select([
        'participant.metadata->>\'yearLevel\' as "yearLevel"',
        'participant.assignedGroup as group',
        'COUNT(*) as count',
      ])
      .where("participant.metadata->>'yearLevel' IS NOT NULL")
      .groupBy("participant.metadata->>'yearLevel'")
      .addGroupBy('participant.assignedGroup')
      .getRawMany();

    const facultyDistribution = await this.studyParticipantRepository
      .createQueryBuilder('participant')
      .select([
        'participant.metadata->>\'faculty\' as "faculty"',
        'participant.assignedGroup as group',
        'COUNT(*) as count',
      ])
      .where("participant.metadata->>'faculty' IS NOT NULL")
      .groupBy("participant.metadata->>'faculty'")
      .addGroupBy('participant.assignedGroup')
      .getRawMany();

    const processDistribution = (rawData: any[], characteristicKey: string) => {
      const result: Record<string, Record<StudyGroup, number>> = {};
      rawData.forEach((item) => {
        const value = item[characteristicKey];
        const group = item.group as StudyGroup;
        const count = parseInt(item.count, 10);

        if (!result[value]) {
          result[value] = { [StudyGroup.GROUP_1]: 0, [StudyGroup.GROUP_2]: 0, [StudyGroup.GROUP_3]: 0 };
        }
        result[value][group] = count;
      });
      return result;
    };

    return {
      totalParticipants,
      groupCounts: groupCounts.reduce((acc, { group, count }) => {
        acc[group] = count;
        return acc;
      }, {} as Record<StudyGroup, number>),
      groupDistributionByCharacteristics: {
        mobileOS: processDistribution(mobileOSDistribution, 'mobileOS'),
        yearLevel: processDistribution(yearLevelDistribution, 'yearLevel'),
        faculty: processDistribution(facultyDistribution, 'faculty'),
      },
    };
  }
}
