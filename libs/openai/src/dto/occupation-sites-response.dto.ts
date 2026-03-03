import { IsString } from 'class-validator';

export class OccupationSitesResponseDto {
  @IsString()
  user_relevant_sites: string;

  @IsString()
  user_typical_distractions: string;
}
