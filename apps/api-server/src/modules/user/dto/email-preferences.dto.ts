import { IsOptional, IsBoolean } from 'class-validator';

export class EmailPreferences {
  @IsOptional()
  @IsBoolean()
  include_shareable_content?: boolean;
}
