import { IsEmail, IsNotEmpty } from 'class-validator';

export class InviteBuddyDto {
  @IsNotEmpty()
  @IsEmail()
  partner_email: string;
}
