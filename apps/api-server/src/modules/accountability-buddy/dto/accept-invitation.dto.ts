import { IsJWT, IsNotEmpty } from 'class-validator';

export class AcceptInvitationDto {
  @IsNotEmpty()
  @IsJWT()
  token: string;
}
