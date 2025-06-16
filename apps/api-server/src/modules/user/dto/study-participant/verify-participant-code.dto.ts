import { IsString, IsNotEmpty } from 'class-validator';

export class VerifyParticipantCodeInfoDto {
  @IsString()
  @IsNotEmpty()
  participantCode: string;
}
