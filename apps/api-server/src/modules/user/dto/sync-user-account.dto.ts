import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class SyncUserAccountDto {
  @IsNotEmpty()
  @IsString()
  auth0_id: string;

  @IsNotEmpty()
  @IsString()
  @IsEmail()
  email: string;
}
