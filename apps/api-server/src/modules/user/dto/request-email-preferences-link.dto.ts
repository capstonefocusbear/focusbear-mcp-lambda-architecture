import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestEmailPreferencesLinkDto {
  @ApiProperty({ description: 'Email address to send the preferences link to' })
  @IsNotEmpty()
  @IsEmail()
  email: string;
}
