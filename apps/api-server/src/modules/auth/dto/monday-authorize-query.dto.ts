import { IsOptional } from 'class-validator';

export class MondayAuthorizeQuery {
  @IsOptional()
  code?: string;

  @IsOptional()
  location?: string;

  @IsOptional()
  ['accounts-server']?: string;
}
