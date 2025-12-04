import { Body, Controller, Get, Post, Put, UseGuards, HttpCode } from '@nestjs/common';
import { ApiSecurity, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthContext } from '../../../shared/decorators/passport.decorator';
import { UpdateActivityDto } from '../../activity/dto/update-activity.dto';
import { Passport } from '../../auth/domain/passport.model';
import { IsAuth } from '../../auth/guards/is-auth/is-auth.guard';
import { UpdateActivityTemplateDto } from '../dto/activity-template.dto';
import { ActivityLibraryService } from '../services/activity-library.service';
import { GetRoutineSuggestionsDto } from '../dto/get-routine-suggestions.dto';
import { AdjustHabitsWithAiDto } from '../dto/adjust-habits-with-ai.dto';
import { RoutineSuggestionsAsyncService } from '../services/routine-suggestions-async.service';
import { CreateHabitWithAiDto } from '../dto/create-habit-with-ai.dto';
import { HabitCreationAsyncService } from '../services/habit-creation-async.service';
import { HabitImportAsyncService } from '../services/habit-import-async.service';
import { GenerateImportUploadUrlDto, HabitImportUploadedDto } from '../dto/import-habits-from-media.dto';
import { R2Service } from '@app/r2';
import { S3_BUCKET_HABIT_IMPORTS } from '../../../shared/utils/constants';

@Controller('activity-library')
@ApiTags('activity-library')
@UseGuards(IsAuth)
@ApiSecurity('Auth0AccessToken')
export class ActivityLibraryController {
  constructor(
    private readonly activityLibraryService: ActivityLibraryService,
    private readonly routineSuggestionsAsyncService: RoutineSuggestionsAsyncService,
    private readonly habitCreationAsyncService: HabitCreationAsyncService,
    private readonly habitImportAsyncService: HabitImportAsyncService,
    private readonly r2Service: R2Service,
  ) {}

  @Get()
  async getLibraryActivities(@AuthContext() { user }: Passport): Promise<UpdateActivityDto[]> {
    return this.activityLibraryService.getLibraryActivities(user.id);
  }

  @Put()
  async upsertLibraryActivities(
    @Body() updateLibraryActivities: UpdateActivityTemplateDto[],
    @AuthContext() { user }: Passport,
  ) {
    return this.activityLibraryService.upsertLibraryActivities(updateLibraryActivities, user.id);
  }

  @Post('/routine-suggestions')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Get routine suggestions based on user goals' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async getRoutineSuggestions(
    @Body() getRoutineSuggestionsDto: GetRoutineSuggestionsDto,
    @AuthContext() { user }: Passport,
  ) {
    return this.activityLibraryService.getActivitiesRelatedToUserGoals(getRoutineSuggestionsDto, user.id, {
      useRag: false,
    });
  }

  @Post('/routine-suggestions/async')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Request routine suggestions asynchronously' })
  @ApiResponse({ status: 202, description: 'Routine suggestion task accepted' })
  @HttpCode(202)
  async getRoutineSuggestionsAsync(
    @Body() getRoutineSuggestionsDto: GetRoutineSuggestionsDto,
    @AuthContext() { user }: Passport,
  ) {
    const { asyncTaskId } = await this.routineSuggestionsAsyncService.enqueueRoutineSuggestions(
      getRoutineSuggestionsDto,
      user.id,
      'api',
    );

    return {
      asyncTaskId,
    };
  }

  @Post('/adjust-habits-with-ai')
  @ApiOperation({ summary: 'Adjust habits using AI based on user feedback' })
  @ApiResponse({ status: 200, description: 'Habits adjusted successfully', type: [UpdateActivityTemplateDto] })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async adjustHabitsWithAi(@Body() adjustHabitsWithAiDto: AdjustHabitsWithAiDto, @AuthContext() { user }: Passport) {
    return this.activityLibraryService.adjustHabitsWithAi(adjustHabitsWithAiDto, user.id);
  }

  @Post('/habits/ai/async')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Create habits using AI asynchronously (RAG preferred)' })
  @HttpCode(202)
  async createHabitWithAiAsync(@Body() createHabitWithAiDto: CreateHabitWithAiDto, @AuthContext() { user }: Passport) {
    const { asyncTaskId } = await this.habitCreationAsyncService.enqueueHabitCreation(
      createHabitWithAiDto,
      user.id,
      'api',
    );
    return { asyncTaskId };
  }

  @Post('/habits/import/generate-upload-url')
  async generateHabitImportUploadUrl(
    @Body() dto: GenerateImportUploadUrlDto,
    @AuthContext() { user }: Passport,
  ): Promise<{ uploadUrl: string; mediaKey: string }> {
    const extension = dto.fileExtension.replace(/^\./, '').toLowerCase();
    const safeExtension = extension || (dto.mediaType === 'image' ? 'png' : 'mp3');
    const mediaKey = `${user.id}-${Date.now()}-habit-import.${safeExtension}`;

    const contentType =
      dto.mediaType === 'image'
        ? this.resolveImageContentType(safeExtension)
        : this.resolveAudioContentType(safeExtension);

    const uploadUrl = await this.r2Service.getPresignedUploadUrl(S3_BUCKET_HABIT_IMPORTS, mediaKey, contentType);
    return { uploadUrl, mediaKey };
  }

  @Post('/habits/import/async')
  @HttpCode(202)
  async triggerHabitImport(
    @Body() dto: HabitImportUploadedDto,
    @AuthContext() { user }: Passport,
  ): Promise<{ asyncTaskId: string }> {
    const { asyncTaskId } = await this.habitImportAsyncService.enqueueHabitImport(dto, user.id, 'api');
    return { asyncTaskId };
  }

  private resolveImageContentType(extension: string): string {
    const map: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      webp: 'image/webp',
      heic: 'image/heic',
      heif: 'image/heif',
    };
    return map[extension] || 'image/png';
  }

  private resolveAudioContentType(extension: string): string {
    const map: Record<string, string> = {
      mp3: 'audio/mpeg',
      mp4: 'audio/mp4',
      m4a: 'audio/mp4',
      wav: 'audio/wav',
      webm: 'audio/webm',
      flac: 'audio/flac',
      oga: 'audio/ogg',
      ogg: 'audio/ogg',
      mpga: 'audio/mpeg',
      mpeg: 'audio/mpeg',
    };
    return map[extension] || 'audio/mpeg';
  }
}
