import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class DeleteFocusModeTagQuery {
  @IsNotEmpty()
  @IsString()
  @IsUUID()
  tag_id: string;
}
