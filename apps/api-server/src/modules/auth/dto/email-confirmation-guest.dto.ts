import { IsEmail, IsNotEmpty } from 'class-validator';

export class EmailConfirmationForGuestDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;
}
