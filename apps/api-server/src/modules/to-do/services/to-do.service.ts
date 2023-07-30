import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ToDoRepository } from '../repositories/to-do.repository';
import { CreateToDoDto } from '../dto/create-to-do.dto';
import { ToDo } from '../entities/to-do.entity';
import { GetToDosQueryDto } from '../dto/get-to-dos-query.dto';
import { FocusModeTag } from '../../focus-mode/entities/focus-mode-tags';

@Injectable()
export class ToDoService {
  constructor(private readonly toDoRepository: ToDoRepository) {}

  async validateUpdatingToDo(userId: string, upsertToDo: CreateToDoDto) {
    const existingToDo = await this.toDoRepository.orm.findOne({ where: { id: upsertToDo.id } });
    if (existingToDo) {
      if (existingToDo.user_id !== userId) {
        throw new UnauthorizedException(
          `User with ID: ${userId} is not allowed to edit todo with ID: ${existingToDo.id}!`,
        );
      }
    }
  }

  async upsertToDo(user_id: string, upsertToDo: CreateToDoDto) {
    if (upsertToDo.id) {
      await this.validateUpdatingToDo(user_id, upsertToDo);
    }
    const tags = upsertToDo?.tags.map((tag) => new FocusModeTag({ ...tag, user_id }));
    const newToDo = new ToDo({ ...upsertToDo, user_id, updated_at: new Date().toISOString(), tags });
    return this.toDoRepository.orm.save(newToDo);
  }

  async getToDos(user_id: string, { page_num, status, eisenhower_quadrant }: GetToDosQueryDto) {
    return this.toDoRepository.getUserToDos(user_id, { page_num, status, eisenhower_quadrant });
  }

  async deleteToDo(user_id: string, toDoId: string) {
    await this.toDoRepository.orm.delete({ user_id, id: toDoId });
  }
}
