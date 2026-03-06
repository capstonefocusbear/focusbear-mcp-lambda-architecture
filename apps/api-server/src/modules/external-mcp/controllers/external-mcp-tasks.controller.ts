import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ExternalMcpTasksService } from '../services/external-mcp-tasks.service';
import { ExternalApiTokenGuard, McpUser, McpScopes } from '../guards/external-api-token.guard';
import { GetToDosQueryDto } from '../../to-do/dto/get-to-dos-query.dto';
import { ToDoResponse } from '../../to-do/dto/to-do-response.dto';
import { TaskComment } from '../../to-do/entities/task-comment.entity';
import { UpdateTaskStatusDto } from '../dto/update-task-status.dto';
import { AddTaskNoteDto } from '../dto/add-task-note.dto';
import { PaginationDto } from '../../../shared/pagination/index.dto';

@Controller('mcp/tasks')
@ApiTags('mcp-tasks')
@UseGuards(ExternalApiTokenGuard)
@ApiSecurity('McpBearerToken')
@Throttle({ default: { limit: 60, ttl: 60000 } })
export class ExternalMcpTasksController {
  constructor(private readonly externalMcpTasksService: ExternalMcpTasksService) {}

  @Get()
  @ApiOperation({
    summary: 'List tasks for the connected user',
    description: 'Returns tasks for the user associated with the bearer token. Requires scope: tasks:read.',
  })
  async listTasks(
    @McpUser() userId: string,
    @McpScopes() scopes: string[],
    @Query() query: GetToDosQueryDto,
  ): Promise<PaginationDto<ToDoResponse>> {
    return this.externalMcpTasksService.listTasks(userId, scopes, query);
  }

  @Put(':id/status')
  @ApiOperation({
    summary: 'Update the status of a task',
    description: 'Updates the status of the specified task. Requires scope: tasks:write.',
  })
  async updateTaskStatus(
    @McpUser() userId: string,
    @McpScopes() scopes: string[],
    @Param('id', ParseUUIDPipe) taskId: string,
    @Body() dto: UpdateTaskStatusDto,
  ): Promise<ToDoResponse> {
    return this.externalMcpTasksService.updateTaskStatus(userId, scopes, taskId, dto);
  }

  @Post(':id/notes')
  @ApiOperation({
    summary: 'Add a note to a task',
    description: 'Adds a comment/note to the specified task. Requires scope: tasks:write.',
  })
  async addNote(
    @McpUser() userId: string,
    @McpScopes() scopes: string[],
    @Param('id', ParseUUIDPipe) taskId: string,
    @Body() dto: AddTaskNoteDto,
  ): Promise<TaskComment> {
    return this.externalMcpTasksService.addNote(userId, scopes, taskId, dto);
  }
}
