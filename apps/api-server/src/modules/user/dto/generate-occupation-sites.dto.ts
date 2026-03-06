import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class GenerateOccupationSitesDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  user_occupation: string;
}
