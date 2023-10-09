import { Body, Controller, Delete, Get, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AuthContext } from '../../../shared/decorators/passport.decorator';
import { Passport } from '../../auth/domain/passport.model';
import { IsAuth } from '../../auth/guards/is-auth/is-auth.guard';
import { ToDoService } from '../services/to-do.service';
import { CreateToDoDto } from '../dto/create-to-do.dto';
import { GetToDosQueryDto } from '../dto/get-to-dos-query.dto';
import { DeleteToDoQuery } from '../dto/delete-todo-query.dto';
import { ToDoResponse } from '../dto/to-do-response.dto';
import { GenerateSubtasksDto } from '../dto/generate-subtasks.dto';

@Controller('to-do')
@ApiTags('to-do')
@UseGuards(IsAuth)
@ApiSecurity('Auth0AccessToken')
export class TodoController {
  constructor(private readonly toDoService: ToDoService) {}

  @Put()
  async upsertToDo(@Body() toDo: CreateToDoDto, @AuthContext() { user }: Passport) {
    return this.toDoService.upsertToDo(user.id, toDo);
  }

  @Get()
  async getUserToDos(
    @Query() { page_num, status, eisenhower_quadrant, should_use_cache }: GetToDosQueryDto,
    @AuthContext() { user }: Passport,
  ): Promise<ToDoResponse[]> {
    return this.toDoService.getToDos(user.id, { page_num, status, eisenhower_quadrant, should_use_cache });
  }

  @Delete()
  async deleteToDo(@Query() { todo_id }: DeleteToDoQuery, @AuthContext() { user }: Passport) {
    return this.toDoService.deleteToDo(user.id, todo_id);
  }

  @Post('/generate-subtasks')
  async generateSubtasks(@Body() { task, language }: GenerateSubtasksDto) {
    return this.toDoService.generateSubtasks({ task, language });
  }
}
