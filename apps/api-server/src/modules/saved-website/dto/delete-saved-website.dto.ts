import { IsNotEmpty, IsUUID } from 'class-validator';

export class DeleteSavedWebsiteDto {
  @IsUUID()
  @IsNotEmpty()
  website_id: string;
}
