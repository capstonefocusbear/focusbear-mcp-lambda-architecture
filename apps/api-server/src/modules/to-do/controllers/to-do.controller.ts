import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AuthContext } from '../../../shared/decorators/passport.decorator';
import { Passport } from '../../auth/domain/passport.model';
import { IsAuth } from '../../auth/guards/is-auth/is-auth.guard';
import { ToDoService } from '../services/to-do.service';
import { CreateToDoDto } from '../dto/create-to-do.dto';
import { GetToDosQueryDto } from '../dto/get-to-dos-query.dto';
import { DeleteToDoQuery } from '../dto/delete-todo-query.dto';
import { ToDoTimeLogDto } from '../dto/to-do-time-log.dto.ts';

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
    @Query() { page_num, status, eisenhower_quadrant }: GetToDosQueryDto,
    @AuthContext() { user }: Passport,
  ) {
    return this.toDoService.getToDos(user.id, { page_num, status, eisenhower_quadrant });
  }

  @Delete()
  async deleteToDo(@Query() { todo_id }: DeleteToDoQuery, @AuthContext() { user }: Passport) {
    return this.toDoService.deleteToDo(user.id, todo_id);
  }

  @Post(':focus_block_id/time-logs')
  async logToDoTime(
    @Body() toDos: ToDoTimeLogDto[],
    @Param() { focus_block_id }: { focus_block_id: string },
    @AuthContext() { user }: Passport,
  ) {
    return this.toDoService.logToDosTime(toDos, user.id, focus_block_id);
  }
}
