import { IsEmail, IsNotEmpty } from 'class-validator';

export class OpenEmailConfirmationDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;
}
