import { IsString, IsNotEmpty, IsObject, IsOptional } from 'class-validator';

export class AddParticipantDetailsDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  email: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
