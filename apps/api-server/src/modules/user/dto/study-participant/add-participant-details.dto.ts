import { IsString, IsNotEmpty, IsObject, IsOptional, IsBoolean, IsEmail } from 'class-validator';

export class AddParticipantDetailsDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  phoneNumber: string;

  @IsBoolean()
  @IsNotEmpty()
  @IsOptional()
  whatsappConsent: boolean;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  lang?: 'en' | 'es';

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
