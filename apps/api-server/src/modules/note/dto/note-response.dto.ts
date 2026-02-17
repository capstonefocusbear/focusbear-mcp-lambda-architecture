import { NoteTag } from '../entities/note-tag.entity';

export class NoteResponseDto {
  id: string;

  title: string;

  body?: string;

  completed_activity_id?: string;

  tags?: NoteTag[];

  embedded_todo_ids?: string[];

  is_brain_dump?: boolean;

  activity_name?: string;

  activity_emoji?: string;

  logged_at?: string;

  created_at: string;

  updated_at: string;
}
