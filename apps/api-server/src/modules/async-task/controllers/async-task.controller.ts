import {
  Controller,
  Get,
  Param,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiSecurity,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { IsAuth } from '../../auth/guards/is-auth/is-auth.guard';
import { AsyncTaskService } from '../services/async-task.service';
import { AsyncTaskResponseDto } from '../dto/async-task-response.dto';

@Controller('async-task')
@UseGuards(IsAuth)
@ApiTags('async-task')
@ApiSecurity('Auth0AccessToken')
export class AsyncTaskController {
  constructor(private readonly asyncTaskService: AsyncTaskService) {}

  @Get(':id')
  @ApiOperation({
    summary: 'Get async task status',
    description:
      'Retrieve the current status and details of an async task by ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique identifier of the async task',
    example: 'uuid-string',
  })
  @ApiResponse({
    status: 200,
    description: 'Async task details retrieved successfully',
    type: AsyncTaskResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Async task not found',
  })
  async getTaskStatus(@Param('id') id: string): Promise<AsyncTaskResponseDto> {
    try {
      const task = await this.asyncTaskService.findTaskById(id);

      return {
        id: task.id,
        status: task.status,
        metadata: task.metadata,
        createdAt: new Date(task.created_at),
        updatedAt: new Date(task.updated_at),
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException(`Async task with ID: ${id} not found`);
    }
  }
}
