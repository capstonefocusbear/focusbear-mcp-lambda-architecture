import { IsOptional } from 'class-validator';

export class ZohoAuthorizeQuery {
  @IsOptional()
  code?: string;

  @IsOptional()
  location?: string;

  @IsOptional()
  ['accounts-server']?: string;
}
