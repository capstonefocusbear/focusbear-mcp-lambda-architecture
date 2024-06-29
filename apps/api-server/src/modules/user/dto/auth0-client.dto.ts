import { IsNotEmpty, IsString } from 'class-validator';

export class Auth0ClientDto {
  @IsNotEmpty()
  @IsString()
  client_id: string;

  @IsNotEmpty()
  @IsString()
  name: string;
}
