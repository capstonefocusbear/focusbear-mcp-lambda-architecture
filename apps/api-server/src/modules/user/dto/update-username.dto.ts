import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class UpdateUsernameDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(30)
  @Matches(new RegExp("^[\\p{L}\\p{M}\\p{N}\\s.'_-]+$", 'u'), {
    message: 'invalid display name; allowed: letters, marks, numbers, space, apostrophe, dot, underscore, hyphen',
  })
  username: string;
}
