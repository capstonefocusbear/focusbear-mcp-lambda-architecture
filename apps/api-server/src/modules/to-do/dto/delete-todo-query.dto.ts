import { IsNotEmpty, IsUUID } from 'class-validator';

export class DeleteToDoQuery {
  @IsNotEmpty()
  @IsUUID()
  todo_id: string;
}
