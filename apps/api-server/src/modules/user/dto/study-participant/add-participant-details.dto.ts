import { IsString, IsNotEmpty, IsObject, IsOptional, IsBoolean } from 'class-validator';

export class AddParticipantDetailsDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
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

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
