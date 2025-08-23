import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { Auth0ClientDto } from './auth0-client.dto';

export class SyncUserAccountDto {
  @IsNotEmpty()
  @IsString()
  auth0_id?: string;

  @IsNotEmpty()
  @IsString()
  @IsEmail()
  email: string;

  auth0_client?: Auth0ClientDto;
}
