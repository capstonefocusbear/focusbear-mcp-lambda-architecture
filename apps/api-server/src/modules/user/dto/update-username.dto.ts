import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class UpdateUsernameDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(30)
  @Matches(/^[A-Za-z0-9]*$/, {
    message: 'username may not include any special characters or spaces, only letters and digits are allowed',
  })
  username: string;
}
