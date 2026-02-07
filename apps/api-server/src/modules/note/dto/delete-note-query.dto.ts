import { IsNotEmpty, IsUUID } from 'class-validator';

export class DeleteNoteQueryDto {
  @IsNotEmpty()
  @IsUUID()
  note_id: string;
}
