import { ApiProperty } from '@nestjs/swagger';
import { AppActivationStatus } from '../../entities/study-participant.entity';

export class ParticipantInfoResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  participantCode: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  assignedGroup: string;

  @ApiProperty({ enum: AppActivationStatus })
  appActivationStatus: AppActivationStatus;

  @ApiProperty({ required: false })
  metadata?: Record<string, any>;

  @ApiProperty({ required: false })
  usageDataLastReceived?: Date;

  @ApiProperty({ required: false })
  healthDataLastReceived?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
