import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { OpenclawMcpTasksService } from '../services/openclaw-mcp-tasks.service';
import { OpenclawTokenGuard, OpenclawUser, OpenclawScopes } from '../guards/openclaw-token.guard';
import { GetToDosQueryDto } from '../../to-do/dto/get-to-dos-query.dto';
import { ToDoResponse } from '../../to-do/dto/to-do-response.dto';
import { TaskComment } from '../../to-do/entities/task-comment.entity';
import { ToDo } from '../../to-do/entities/to-do.entity';
import { UpdateTaskStatusDto } from '../dto/update-task-status.dto';
import { AddTaskNoteDto } from '../dto/add-task-note.dto';
import { PaginationDto } from '../../../shared/pagination/index.dto';

@Controller('openclaw-mcp/tasks')
@ApiTags('openclaw-mcp-tasks')
@UseGuards(OpenclawTokenGuard)
@ApiSecurity('OpenclawBearerToken')
export class OpenclawMcpTasksController {
  constructor(private readonly openclawMcpTasksService: OpenclawMcpTasksService) {}

  @Get()
  @ApiOperation({
    summary: 'List tasks for the connected user',
    description: 'Returns tasks for the user associated with the bearer token. Requires scope: tasks:read.',
  })
  async listTasks(
    @OpenclawUser() userId: string,
    @OpenclawScopes() scopes: string[],
    @Query() query: GetToDosQueryDto,
  ): Promise<PaginationDto<ToDoResponse>> {
    return this.openclawMcpTasksService.listTasks(userId, scopes, query);
  }

  @Put(':id/status')
  @ApiOperation({
    summary: 'Update the status of a task',
    description: 'Updates the status of the specified task. Requires scope: tasks:write.',
  })
  async updateTaskStatus(
    @OpenclawUser() userId: string,
    @OpenclawScopes() scopes: string[],
    @Param('id') taskId: string,
    @Body() dto: UpdateTaskStatusDto,
  ): Promise<ToDo> {
    return this.openclawMcpTasksService.updateTaskStatus(userId, scopes, taskId, dto);
  }

  @Post(':id/notes')
  @ApiOperation({
    summary: 'Add a note to a task',
    description: 'Adds a comment/note to the specified task. Requires scope: tasks:write.',
  })
  async addNote(
    @OpenclawUser() userId: string,
    @OpenclawScopes() scopes: string[],
    @Param('id') taskId: string,
    @Body() dto: AddTaskNoteDto,
  ): Promise<TaskComment> {
    return this.openclawMcpTasksService.addNote(userId, scopes, taskId, dto);
  }
}
