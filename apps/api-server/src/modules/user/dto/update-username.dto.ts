import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class UpdateUsernameDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(30)
  @Matches(/^([A-Za-z]|[0-9]|_)+$/, {
    message: 'invalid username, only letters, digits, and underscores are allowed',
  })
  username: string;
}
