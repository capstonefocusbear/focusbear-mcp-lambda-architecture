import { IsString, IsUUID, Length, IsISO8601 } from 'class-validator';
export class RenameMcpConnectionDto {
  @IsString()
  @Length(1, 100)
  display_name: string;
}
export class LinkMcpConnectionDto {
  @IsUUID()
  legacy_token_id: string;
}

export class ConfirmMcpRevocationDto {
  @IsISO8601()
  revision: string;

  @IsString()
  @Length(10, 2000)
  evidence: string;
}
