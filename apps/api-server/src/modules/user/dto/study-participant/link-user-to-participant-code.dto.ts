import { IsString, IsNotEmpty } from 'class-validator';

export class LinkUserToParticipantCodeDto {
  @IsString()
  @IsNotEmpty()
  participantCode: string;
}
