/* eslint-disable no-console */
import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SendGridService } from '@app/send-grid';
import { Auth0ManagementService } from '@app/auth0';
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
  ) {}

  async addParticipantDetails(dto: AddParticipantDetailsDto): Promise<void> {
    // TODO: Uncomment this when we officially launch the study (for testing purposes)
    // if (!dto.email.endsWith('@catolica.edu.sv') && !dto.email.endsWith('@focusbear.io')) {
    //   throw new BadRequestException('Email must be a valid Catolica email');
    // }

    const existingParticipant = await this.studyParticipantRepository.findOne({
      where: { email: dto.email },
    });

    if (existingParticipant) {
      throw new ConflictException('Email already exists registered for the study');
    }

    let participantCode = Math.random().toString(36).substring(2, 8);

    // TODO: Remove this once we officially launch the study (this is for testing purposes)
    if (dto.email.endsWith('@focusbear.io')) {
      const [, extractedCode] = dto.email.match(/internaltest\+unicaes_([a-zA-Z0-9]{6})@focusbear\.io/) || [];

      if (extractedCode) {
        participantCode = extractedCode;
      }
    }
    const participant = new StudyParticipant();

    Object.assign(participant, {
      ...dto,
      participantCode,
      phoneNumber: dto?.phoneNumber || '',
      optedOut: !dto?.whatsappConsent,
    });

    await this.studyParticipantRepository.save(participant);

    await this.sendGridService.sendEmail({
      from: FOCUS_BEAR_EMAILS.SUPPORT,
      to: dto.email,
      replyTo: FOCUS_BEAR_EMAILS.SUPPORT,
      subject: 'Participant Code for the Focus Bear Study',
      text: `Your participant code for the Focus Bear Study is ${participantCode}. Please use this code to participate in the study.`,
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
}
