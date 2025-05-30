/* eslint-disable no-console */
import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SendGridService } from '@app/send-grid';
import { FOCUS_BEAR_EMAILS } from '@api-server/shared/utils/constants';
import { User } from '@api-server/modules/user/entities/user.entity';
import { Auth0ManagementService } from '@app/auth0';
import { StudyParticipant } from '../../entities/study-participant.entity';
import {
  AddParticipantDetailsDto,
  LinkUserToParticipantCodeDto,
  ParticipantCodeResponseDto,
} from '../../dto/study-participant';

@Injectable()
export class StudyParticipantService {
  constructor(
    @InjectRepository(StudyParticipant)
    private readonly studyParticipantRepository: Repository<StudyParticipant>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly sendGridService: SendGridService,
    private readonly auth0ManagementService: Auth0ManagementService,
  ) {}

  async getParticipantByCode(participantCode: string): Promise<StudyParticipant> {
    return this.studyParticipantRepository.findOne({
      where: { participantCode },
    });
  }

  async addParticipantDetails(dto: AddParticipantDetailsDto): Promise<void> {
    if (!dto.email.endsWith('@catolica.edu.sv') && !dto.email.endsWith('@focusbear.io')) {
      throw new BadRequestException('Email must be a valid Catolica email');
    }

    const existingParticipant = await this.studyParticipantRepository.findOne({
      where: { email: dto.email },
    });

    if (existingParticipant) {
      throw new ConflictException('Email already exists registered for the study');
    }

    const participantCode = Math.random().toString(36).substring(2, 8);

    const participant = new StudyParticipant();

    Object.assign(participant, {
      ...dto,
      participantCode,
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

    return {
      email: participant.email,
    };
  }

  async linkUserToParticipantCode(dto: LinkUserToParticipantCodeDto, userId: string): Promise<{ user_id: string }> {
    const participant = await this.studyParticipantRepository.findOne({
      where: { participantCode: dto.participantCode },
    });

    if (!participant) {
      throw new NotFoundException('Participant code not found');
    }

    const user = await this.userRepository.findOneBy({ id: userId });
    const auth0User = await this.auth0ManagementService.getAuth0User(user.auth0_id);

    if (participant.email !== auth0User.email) {
      throw new ConflictException(
        "The participant code doesn't match your email address. Please contact support@focusbear.io",
      );
    }

    await this.studyParticipantRepository.update({ participantCode: dto.participantCode }, { userId });

    return {
      user_id: userId,
    };
  }

  async getParticipantByUserId(userId: string): Promise<StudyParticipant> {
    const participant = await this.studyParticipantRepository.findOne({
      where: { userId },
    });

    if (!participant) {
      throw new NotFoundException('Study participant not found for this user');
    }

    return participant;
  }
}
