import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class Auth0ClientDto {
  @IsNotEmpty()
  @IsString()
  client_id: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  user_agent?: string;
}
