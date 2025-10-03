import { Body, Controller, Delete, Get, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { R2Service } from '@app/r2';
import { OpenAIService } from '@app/openai';
import { AuthContext } from '../../../shared/decorators/passport.decorator';
import { Passport } from '../../auth/domain/passport.model';
import { IsAuth } from '../../auth/guards/is-auth/is-auth.guard';
import { ToDoService } from '../services/to-do.service';
import { CreateToDoDto } from '../dto/create-to-do.dto';
import { GetToDosQueryDto } from '../dto/get-to-dos-query.dto';
import { DeleteToDoQuery } from '../dto/delete-todo-query.dto';
import { ToDoResponse } from '../dto/to-do-response.dto';
import { GenerateSubtasksDto } from '../dto/generate-subtasks.dto';
import { SearchToDosDto } from '../dto/search-to-do.dto';
import { RecentToDoDto } from '../dto/recent-to-do.dto';
import { ConvertBrainDump } from '../dto/convert-brain-dump.dto';
import { PaginationDto } from '../../../shared/pagination/index.dto';
import { BullQueues, BullWorkers, S3_BUCKET_TODO_AUDIOS, S3_BUCKET_TODO_IMAGES } from '../../../shared/utils/constants';
import { AsyncTaskService } from '../../async-task/services/async-task.service';

@Controller('to-do')
@ApiTags('to-do')
@UseGuards(IsAuth)
@ApiSecurity('Auth0AccessToken')
export class TodoController {
  constructor(
    private readonly toDoService: ToDoService,
    private readonly r2Service: R2Service,
    private readonly openAIService: OpenAIService,
    @InjectQueue(BullQueues.TODO_IMAGE) private todoImageQueue: Queue,
    @InjectQueue(BullQueues.TODO_AUDIO) private todoAudioQueue: Queue,
    private readonly asyncTaskService: AsyncTaskService,
  ) {}

  @Put()
  async upsertToDo(@Body() toDo: CreateToDoDto, @AuthContext() { user }: Passport) {
    return this.toDoService.upsertToDo(user.id, toDo);
  }

  @Get()
  async getUserToDos(
    @Query() getToDosQueryDto: GetToDosQueryDto,
    @AuthContext() { user }: Passport,
  ): Promise<PaginationDto<ToDoResponse>> {
    return this.toDoService.getToDos(user.id, getToDosQueryDto);
  }

  @Delete()
  async deleteToDo(@Query() { todo_id }: DeleteToDoQuery, @AuthContext() { user }: Passport) {
    return this.toDoService.deleteToDo(user.id, todo_id);
  }

  @Post('/generate-subtasks')
  async generateSubtasks(@Body() { task, language }: GenerateSubtasksDto) {
    return this.toDoService.generateSubtasks({ task, language });
  }

  @Get('search')
  async searchToDos(@Query() searchToDosDto: SearchToDosDto, @AuthContext() { user }: Passport) {
    return this.toDoService.searchToDos(searchToDosDto, user.id);
  }

  @Get('recent')
  async recentToDos(@Query() recentToDoDto: RecentToDoDto, @AuthContext() { user }: Passport) {
    return this.toDoService.getRecentToDos(recentToDoDto, user.id);
  }

  @Post('convert-brain-dump')
  async convertBrainDump(@Body() convertBrainDump: ConvertBrainDump) {
    return this.toDoService.createToDosFromBrainDump(convertBrainDump);
  }

  @Post('generate-upload-image-url')
  async generateUploadImageUrl(@AuthContext() { user }: Passport): Promise<{ uploadUrl: string; imageKey: string }> {
    const imageKey = `${user.id}-${Date.now()}-todo-image.png`;

    const uploadUrl = await this.r2Service.getPresignedUploadUrl(S3_BUCKET_TODO_IMAGES, imageKey, 'image/png');
    return { uploadUrl, imageKey };
  }

  @Post('todo-image-uploaded')
  async todoImageUploaded(@Body() { imageKey }: { imageKey: string }, @AuthContext() { user }: Passport) {
    // Create AsyncTask record
    const asyncTask = await this.asyncTaskService.createAsyncTask({
      metadata: {
        taskType: 'todo-image-processing',
        userId: user.id,
        imageKey,
      },
    });

    // Queue the job with asyncTaskId
    await this.todoImageQueue.add(
      BullWorkers.PROCESS_TODO_IMAGE,
      {
        userId: user.id,
        imageKey,
        asyncTaskId: asyncTask.id,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    );

    return { asyncTaskId: asyncTask.id };
  }

  @Post('generate-upload-audio-url')
  async generateUploadAudioUrl(
    @AuthContext() { user }: Passport,
    @Body() { fileExtension }: { fileExtension: string },
  ): Promise<{ uploadUrl: string; audioKey: string }> {
    const audioKey = `${user.id}-${Date.now()}-todo-audio.${fileExtension}`;
    const uploadUrl = await this.r2Service.getPresignedUploadUrl(S3_BUCKET_TODO_AUDIOS, audioKey, 'audio/mpeg');
    return { uploadUrl, audioKey };
  }

  @Post('todo-audio-uploaded')
  async todoAudioUploaded(@Body() { audioKey }: { audioKey: string }, @AuthContext() { user }: Passport) {
    const asyncTask = await this.asyncTaskService.createAsyncTask({
      metadata: {
        taskType: 'todo-audio-processing',
        userId: user.id,
        audioKey,
      },
    });

    await this.todoAudioQueue.add(
      BullWorkers.PROCESS_TODO_AUDIO,
      {
        userId: user.id,
        audioKey,
        asyncTaskId: asyncTask.id,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
      },
    );

    return { asyncTaskId: asyncTask.id };
  }
}
