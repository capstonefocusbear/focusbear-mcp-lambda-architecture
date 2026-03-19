import { IsOptional } from 'class-validator';

export class MondayAuthorizeQuery {
  @IsOptional()
  code?: string;

  @IsOptional()
  location?: string;

  @IsOptional()
  // biome-ignore lint/complexity/useLiteralKeys: square brackets are intentional
  ['accounts-server']?: string;
}
