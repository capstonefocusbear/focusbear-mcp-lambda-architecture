import { Process, Processor } from '@nestjs/bull';
import { InjectSentry, SentryService, emitAiPipelineMetrics } from '@app/observability';
import { Job } from 'bull';
import { R2Service } from '@app/r2';
import { OpenAIService } from '@app/openai';
import axios from 'axios';
import { toFile } from 'openai/uploads';
import { extname } from 'path';
import { createHash, randomUUID } from 'crypto';
import { Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sharp from 'sharp';
import { isUUID } from 'class-validator';
import { AsyncTaskService } from '../../async-task/services/async-task.service';
import { AsyncTaskStatus } from '../../async-task/domain/async-task-status.enum';
import {
  HabitImportExtractionService,
  MatchExtractedHabitsTelemetry,
} from '../services/habit-import-extraction.service';
import { ExtractedHabit, HabitImportJobData, HabitSuggestionResult } from '../dto/import-habits-from-media.dto';
import { BullQueues, BullWorkers, S3_BUCKET_HABIT_IMPORTS } from '../../../shared/utils/constants';
import { UpdateActivityDto } from '../../activity/dto/update-activity.dto';
import { ActivityType } from '../../activity/domain/activity-type.enum';
import { MetricsConfig } from '../../../config/metrics.config';
import { ActivityLibraryService } from '../services/activity-library.service';

const MIN_IMAGE_DIMENSION = 768;
const ONE_MINUTE_SECONDS = 60;

type HabitImportStageDurations = {
  presignUrlMs: number;
  downloadMediaMs: number;
  preprocessMediaMs: number;
  extractHabitsMs: number;
  matchHabitsMs: number;
  logUnmatchedMs: number;
  updateTaskMs: number;
  totalMs: number;
};

type HabitImportCounters = {
  extractedCount: number;
  matchedCount: number;
  unmatchedCount: number;
  rerankLlmCalls: number;
  rerankShortcutAccepts: number;
  rerankShortcutRejects: number;
  embeddingBatchCalls: number;
};

@Processor(BullQueues.HABIT_IMPORT)
export class HabitImportConsumer {
  private readonly logger = new Logger(HabitImportConsumer.name);

  constructor(
    @InjectSentry() private readonly sentryService: SentryService,
    private readonly r2Service: R2Service,
    private readonly openAIService: OpenAIService,
    private readonly asyncTaskService: AsyncTaskService,
    private readonly habitImportExtractionService: HabitImportExtractionService,
    private readonly activityLibraryService: ActivityLibraryService,
    @Optional() private readonly configService?: ConfigService,
  ) {}

  @Process(BullWorkers.PROCESS_HABIT_IMPORT)
  async processHabitImport(job: Job<HabitImportJobData>): Promise<UpdateActivityDto[]> {
    const { asyncTaskId, userId, mediaKey, mediaType, routineType, requestHash } = job.data;
    const attempt = job.attemptsMade + 1;
    const stageDurations = this.createEmptyStageDurations();
    const counters = this.createEmptyCounters();
    const pipelineStartedAt = Date.now();
    let success = false;
    let processingError: Error | null = null;
    let matchingTelemetry = this.createEmptyMatchingTelemetry();

    const baseMetadata = {
      taskType: 'habit-import',
      userId,
      mediaKey,
      mediaType,
    };

    // Update status to PROCESSING
    await this.asyncTaskService.updateStatusWithMetadata(asyncTaskId, AsyncTaskStatus.PROCESSING, baseMetadata, {
      processingStarted: new Date(),
    });

    try {
      this.logger.debug(
        `HabitImport:start ${JSON.stringify({
          asyncTaskId,
          userId,
          mediaKey,
          mediaType,
          routineType: routineType ?? null,
          requestHash,
          jobId: job.id,
          attempt,
        })}`,
      );

      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Processing habit import',
        data: { asyncTaskId, userId, mediaKey, mediaType, routineType, requestHash },
      });

      // 1. Fetch file from R2
      const presignStartedAt = Date.now();
      const fileUrl = await this.r2Service.getPresignedUrl(S3_BUCKET_HABIT_IMPORTS, mediaKey);
      stageDurations.presignUrlMs += Date.now() - presignStartedAt;
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Habit import presigned URL generated',
        data: { asyncTaskId, bucket: S3_BUCKET_HABIT_IMPORTS, mediaKey },
      });

      // 2. Extract habits based on media type
      const mediaProcessingResult =
        mediaType === 'image'
          ? await this.fetchAndProcessImage(fileUrl, mediaKey, asyncTaskId)
          : await this.fetchAndProcessAudio(fileUrl, mediaKey);
      const { extractedHabits } = mediaProcessingResult;
      stageDurations.downloadMediaMs += mediaProcessingResult.timings.downloadMediaMs;
      stageDurations.preprocessMediaMs += mediaProcessingResult.timings.preprocessMediaMs;
      stageDurations.extractHabitsMs += mediaProcessingResult.timings.extractHabitsMs;
      counters.extractedCount = extractedHabits.length;

      if (!extractedHabits || extractedHabits.length === 0) {
        const updateStartedAt = Date.now();
        const emptyResult = await this.handleEmptyExtraction(asyncTaskId, baseMetadata, {
          userId,
          mediaKey,
          mediaType,
          routineType,
          requestHash,
        });
        stageDurations.updateTaskMs += Date.now() - updateStartedAt;
        success = true;
        return emptyResult;
      }

      // 3. Match extracted habits against library (filtered by routine type if provided)
      const matchStartedAt = Date.now();
      const matchingResult = await this.habitImportExtractionService.matchExtractedHabitsWithTelemetry(
        extractedHabits,
        {
          routineType,
        },
      );
      stageDurations.matchHabitsMs += Date.now() - matchStartedAt;
      const { results } = matchingResult;
      matchingTelemetry = matchingResult.telemetry;
      const usableHabits = this.formatHabitImportResult(results, routineType, requestHash);

      // 4. Ensure all habits have text_instructions (generate via AI if missing)
      await this.ensureHabitsHaveInstructions(usableHabits);

      // 5. Log unmatched habits to habit_library_requests
      const logStartedAt = Date.now();
      await this.habitImportExtractionService.logUnmatchedHabits(results, userId, {
        asyncTaskId,
        mediaType,
        routineType,
      });
      stageDurations.logUnmatchedMs += Date.now() - logStartedAt;

      const matchedCount = results.filter((r) => r.matched).length;
      const unmatchedCount = results.filter((r) => !r.matched).length;
      counters.matchedCount = matchedCount;
      counters.unmatchedCount = unmatchedCount;

      // 6. Update AsyncTask with results
      const updateStartedAt = Date.now();
      await this.asyncTaskService.updateStatusWithMetadata(asyncTaskId, AsyncTaskStatus.COMPLETED, baseMetadata, {
        processingCompleted: new Date(),
        extractedCount: extractedHabits.length,
        matchedCount,
        unmatchedCount,
        result: usableHabits,
      });
      stageDurations.updateTaskMs += Date.now() - updateStartedAt;

      success = true;
      return usableHabits;
    } catch (error) {
      processingError = error instanceof Error ? error : new Error(String(error));

      // Update status to FAILED
      const updateStartedAt = Date.now();
      await this.asyncTaskService.updateStatusWithMetadata(asyncTaskId, AsyncTaskStatus.FAILED, baseMetadata, {
        processingFailed: new Date(),
        error: processingError.message,
      });
      stageDurations.updateTaskMs += Date.now() - updateStartedAt;

      this.sentryService.instance().captureException(processingError, {
        level: 'error',
        extra: { userId, mediaKey, mediaType, asyncTaskId },
      });

      throw error;
    } finally {
      stageDurations.totalMs = Date.now() - pipelineStartedAt;
      counters.rerankLlmCalls = matchingTelemetry.rerankLlmCalls;
      counters.rerankShortcutAccepts = matchingTelemetry.rerankShortcutAccepts;
      counters.rerankShortcutRejects = matchingTelemetry.rerankShortcutRejects;
      counters.embeddingBatchCalls = matchingTelemetry.embeddingBatchCalls;

      await this.emitPipelineTimingAndMetrics({
        asyncTaskId,
        jobId: String(job.id ?? ''),
        requestHash,
        attempt,
        success,
        stageDurations,
        counters,
        error: processingError ?? undefined,
      });
    }
  }

  private resolveImageMimeType(mediaKey: string, headerContentType?: string): string {
    const known = ['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif'];
    if (headerContentType && known.includes(headerContentType.toLowerCase())) {
      return headerContentType.toLowerCase();
    }

    const ext = extname(mediaKey).toLowerCase();
    const map: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
      '.heic': 'image/heic',
      '.heif': 'image/heif',
    };
    return map[ext] || 'image/png';
  }

  private async fetchAndProcessImage(
    fileUrl: string,
    mediaKey: string,
    asyncTaskId: string,
  ): Promise<{
    extractedHabits: ExtractedHabit[];
    timings: { downloadMediaMs: number; preprocessMediaMs: number; extractHabitsMs: number };
  }> {
    const downloadStartedAt = Date.now();
    const imageResponse = await axios.get<ArrayBuffer>(fileUrl, {
      responseType: 'arraybuffer',
      timeout: 120000,
    });
    const downloadMediaMs = Date.now() - downloadStartedAt;
    const contentTypeHeader = imageResponse.headers?.['content-type'] as string | undefined;
    let buffer = Buffer.from(imageResponse.data);
    const originalBytes = buffer.byteLength;
    const sha256 = createHash('sha256').update(buffer).digest('hex');

    const preprocessStartedAt = Date.now();
    const {
      buffer: processedBuffer,
      upscaled,
      originalWidth,
      originalHeight,
    } = await this.upscaleImageIfNeeded(buffer, asyncTaskId);
    const preprocessMediaMs = Date.now() - preprocessStartedAt;
    buffer = processedBuffer;

    const bytes = buffer.byteLength;
    const base64 = buffer.toString('base64');
    const inferredMimeType = upscaled ? 'image/png' : this.resolveImageMimeType(mediaKey, contentTypeHeader);
    const imageBuffer = `data:${inferredMimeType};base64,${base64}`;

    this.logger.debug(
      `HabitImport:imageFetched ${JSON.stringify({
        asyncTaskId,
        mediaKey,
        contentTypeHeader: contentTypeHeader ?? null,
        inferredMimeType,
        originalBytes,
        bytes,
        sha256,
        originalWidth,
        originalHeight,
        upscaled,
      })}`,
    );
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Habit import image fetched',
      data: { asyncTaskId, mediaKey, contentTypeHeader, inferredMimeType, bytes, sha256, upscaled },
    });

    const extractStartedAt = Date.now();
    const extractedHabits = await this.habitImportExtractionService.extractHabitsFromImage(imageBuffer);
    const extractHabitsMs = Date.now() - extractStartedAt;
    this.logger.debug(
      `HabitImport:imageExtracted ${JSON.stringify({
        asyncTaskId,
        mediaKey,
        extractedCount: extractedHabits?.length ?? 0,
      })}`,
    );

    return {
      extractedHabits,
      timings: {
        downloadMediaMs,
        preprocessMediaMs,
        extractHabitsMs,
      },
    };
  }

  private async upscaleImageIfNeeded(
    inputBuffer: Buffer,
    asyncTaskId: string,
  ): Promise<{ buffer: Buffer; upscaled: boolean; originalWidth: number; originalHeight: number }> {
    const metadata = await sharp(inputBuffer).metadata();
    const originalWidth = metadata.width ?? 0;
    const originalHeight = metadata.height ?? 0;

    if (originalWidth >= MIN_IMAGE_DIMENSION && originalHeight >= MIN_IMAGE_DIMENSION) {
      return { buffer: inputBuffer, upscaled: false, originalWidth, originalHeight };
    }

    const scaleFactor = Math.max(MIN_IMAGE_DIMENSION / originalWidth, MIN_IMAGE_DIMENSION / originalHeight);
    const newWidth = Math.round(originalWidth * scaleFactor);
    const newHeight = Math.round(originalHeight * scaleFactor);

    this.logger.debug(
      `HabitImport:upscaling ${JSON.stringify({
        asyncTaskId,
        originalWidth,
        originalHeight,
        newWidth,
        newHeight,
        scaleFactor: scaleFactor.toFixed(2),
      })}`,
    );

    const upscaledBuffer = await sharp(inputBuffer)
      .resize(newWidth, newHeight, {
        kernel: 'lanczos3',
        fit: 'fill',
      })
      .png()
      .toBuffer();

    return { buffer: upscaledBuffer, upscaled: true, originalWidth, originalHeight };
  }

  private async fetchAndProcessAudio(
    fileUrl: string,
    mediaKey: string,
  ): Promise<{
    extractedHabits: ExtractedHabit[];
    timings: { downloadMediaMs: number; preprocessMediaMs: number; extractHabitsMs: number };
  }> {
    const downloadStartedAt = Date.now();
    const audioResponse = await axios.get<ArrayBuffer>(fileUrl, {
      responseType: 'arraybuffer',
      timeout: 120000,
    });
    const downloadMediaMs = Date.now() - downloadStartedAt;
    const buffer = Buffer.from(audioResponse.data);
    const rawExt = extname(mediaKey).toLowerCase();
    const allowed = new Set(['.flac', '.m4a', '.mp3', '.mp4', '.mpeg', '.mpga', '.oga', '.ogg', '.wav', '.webm']);
    const safeExt = allowed.has(rawExt) ? rawExt : '.mp3';
    const fileName = `habit-import-audio${safeExt}`;
    const file = await toFile(buffer, fileName);

    const extractStartedAt = Date.now();
    const transcript = await this.openAIService.transcribeAudioToText(file as unknown as File);

    if (!transcript || transcript.trim().length === 0) {
      throw new Error('Empty transcript from audio');
    }

    const extractedHabits = await this.habitImportExtractionService.extractHabitsFromTranscript(transcript);
    const extractHabitsMs = Date.now() - extractStartedAt;

    return {
      extractedHabits,
      timings: {
        downloadMediaMs,
        preprocessMediaMs: 0,
        extractHabitsMs,
      },
    };
  }

  private async handleEmptyExtraction(
    asyncTaskId: string,
    baseMetadata: Record<string, unknown>,
    logData: { userId: string; mediaKey: string; mediaType: string; routineType?: string; requestHash: string },
  ): Promise<[]> {
    this.logger.warn(
      `HabitImport:emptyExtraction ${JSON.stringify({
        asyncTaskId,
        userId: logData.userId,
        mediaKey: logData.mediaKey,
        mediaType: logData.mediaType,
        routineType: logData.routineType ?? null,
        requestHash: logData.requestHash,
      })}`,
    );
    this.sentryService.instance().captureMessage('Habit import produced 0 extracted habits', {
      level: 'warning',
      extra: { asyncTaskId, ...logData },
    });
    await this.asyncTaskService.updateStatusWithMetadata(asyncTaskId, AsyncTaskStatus.COMPLETED, baseMetadata, {
      processingCompleted: new Date(),
      extractedCount: 0,
      matchedCount: 0,
      unmatchedCount: 0,
      result: [],
    });
    return [];
  }

  private formatHabitImportResult(
    results: HabitSuggestionResult[],
    routineType?: string,
    requestHash?: string,
  ): UpdateActivityDto[] {
    const requestedActivityType = this.resolveActivityTypeFromRoutineType(routineType);
    const fallbackActivityType = requestedActivityType ?? ActivityType.library;
    return results
      .map((result, index) => {
        const sourceHabit = result.suggestedHabit ? result.suggestedHabit : result.extractedHabit;
        const template = result.matchedTemplate;
        const durationSeconds = this.resolveDurationSeconds(template, sourceHabit);

        const rawId = template?.id;
        let resolvedId: string;
        if (rawId && isUUID(rawId)) {
          resolvedId = rawId;
        } else if (!result.matched) {
          resolvedId = this.buildDeterministicUnmatchedHabitId(requestHash, sourceHabit, index);
        } else {
          resolvedId = randomUUID();
        }

        const name = this.resolveHabitName(template, sourceHabit);
        if (!name) {
          return null;
        }

        const rawDescription = template?.description ? template.description : sourceHabit.description;
        const description = rawDescription || name;
        let activityType: string;
        if (requestedActivityType !== undefined) {
          activityType = String(requestedActivityType);
        } else if (template?.activityType) {
          activityType = String(template.activityType);
        } else {
          activityType = String(fallbackActivityType);
        }

        const habit: UpdateActivityDto = {
          id: resolvedId,
          name,
          duration_seconds: Number.isFinite(Number(durationSeconds))
            ? Math.max(0, Math.round(Number(durationSeconds)))
            : 0,
          activity_type: activityType,
          category: sourceHabit.category,
          text_instructions: description,
        };
        return habit;
      })
      .filter((habit): habit is UpdateActivityDto => Boolean(habit));
  }

  private buildDeterministicUnmatchedHabitId(
    requestHash: string | undefined,
    habit: ExtractedHabit,
    index: number,
  ): string {
    const payload = JSON.stringify({
      requestHash: requestHash ?? 'missing_request_hash',
      index,
      name: (habit?.name ?? '').trim().toLowerCase(),
      description: (habit?.description ?? '').trim().toLowerCase(),
      estimatedDurationMinutes: Number.isFinite(habit?.estimatedDurationMinutes)
        ? habit.estimatedDurationMinutes
        : null,
      category: (habit?.category ?? '').trim().toLowerCase(),
    });
    return this.createDeterministicUuid(payload);
  }

  private createDeterministicUuid(seed: string): string {
    const hash = createHash('sha256').update(seed).digest('hex');
    const part1 = hash.slice(0, 8);
    const part2 = hash.slice(8, 12);
    const part3 = `5${hash.slice(13, 16)}`; // UUIDv5-compatible version nibble
    const variantSource = hash.slice(16, 17).toLowerCase();
    const variantMap: Record<string, string> = {
      0: '8',
      1: '9',
      2: 'a',
      3: 'b',
      4: '8',
      5: '9',
      6: 'a',
      7: 'b',
      8: '8',
      9: '9',
      a: 'a',
      b: 'b',
      c: '8',
      d: '9',
      e: 'a',
      f: 'b',
    };
    const variantNibble = variantMap[variantSource] || '8';
    const part4 = `${variantNibble}${hash.slice(17, 20)}`;
    const part5 = hash.slice(20, 32);
    return `${part1}-${part2}-${part3}-${part4}-${part5}`;
  }

  private resolveHabitName(
    template: HabitSuggestionResult['matchedTemplate'] | undefined,
    habit: ExtractedHabit,
  ): string {
    if (template?.name) {
      return String(template.name).trim();
    }
    if (habit?.name) {
      return String(habit.name).trim();
    }
    return '';
  }

  private resolveDurationSeconds(
    template: HabitSuggestionResult['matchedTemplate'] | undefined,
    habit: ExtractedHabit,
  ): number | undefined {
    if (typeof template?.durationSeconds === 'number') {
      return template.durationSeconds;
    }
    if (Number.isFinite(habit?.estimatedDurationMinutes)) {
      return habit.estimatedDurationMinutes * ONE_MINUTE_SECONDS;
    }
    return undefined;
  }

  private async ensureHabitsHaveInstructions(
    habits: Array<UpdateActivityDto & { description?: string }>,
  ): Promise<void> {
    await this.activityLibraryService.ensureHabitsHaveInstructions(habits);
  }

  private createEmptyStageDurations(): HabitImportStageDurations {
    return {
      presignUrlMs: 0,
      downloadMediaMs: 0,
      preprocessMediaMs: 0,
      extractHabitsMs: 0,
      matchHabitsMs: 0,
      logUnmatchedMs: 0,
      updateTaskMs: 0,
      totalMs: 0,
    };
  }

  private createEmptyCounters(): HabitImportCounters {
    return {
      extractedCount: 0,
      matchedCount: 0,
      unmatchedCount: 0,
      rerankLlmCalls: 0,
      rerankShortcutAccepts: 0,
      rerankShortcutRejects: 0,
      embeddingBatchCalls: 0,
    };
  }

  private createEmptyMatchingTelemetry(): MatchExtractedHabitsTelemetry {
    return {
      embeddingBatchCalls: 0,
      ragRetrieveMs: 0,
      ragTemplateFetchMs: 0,
      ragRerankMs: 0,
      rerankLlmCalls: 0,
      rerankShortcutAccepts: 0,
      rerankShortcutRejects: 0,
    };
  }

  private async emitPipelineTimingAndMetrics({
    asyncTaskId,
    jobId,
    requestHash,
    attempt,
    success,
    stageDurations,
    counters,
    error,
  }: {
    asyncTaskId: string;
    jobId: string;
    requestHash: string;
    attempt: number;
    success: boolean;
    stageDurations: HabitImportStageDurations;
    counters: HabitImportCounters;
    error?: Error;
  }): Promise<void> {
    const payload = {
      event: 'AiPipelineTimingV1',
      pipeline: 'habit-import',
      operation: 'processHabitImport',
      success,
      durationMs: stageDurations.totalMs,
      stageDurationsMs: stageDurations,
      counters,
      asyncTaskId,
      jobId,
      requestHash,
      attempt,
      errorName: error?.name,
      errorMessage: error?.message,
    };

    if (success) {
      this.logger.log(JSON.stringify(payload));
    } else {
      this.logger.error(JSON.stringify(payload), error?.stack);
    }

    const metrics = this.getMetricsConfig();
    const shouldEmitMetrics = Boolean(metrics.emitUserActivityMetrics || metrics.emitQueueMetrics);
    if (!shouldEmitMetrics) {
      return;
    }

    try {
      await emitAiPipelineMetrics({
        namespace: metrics.namespace,
        environment: metrics.environment,
        service: metrics.service,
        pipeline: 'habit-import',
        operation: 'processHabitImport',
        success,
        durationMs: stageDurations.totalMs,
        stageDurationsMs: stageDurations,
        counters,
      });
    } catch {
      // Best-effort: metrics must not affect pipeline processing.
    }
  }

  private getMetricsConfig(): MetricsConfig {
    return (
      this.configService?.get<MetricsConfig>('metrics') || {
        emitQueueMetrics: true,
        emitUserActivityMetrics: true,
        pollIntervalMs: 60_000,
        namespace: 'FocusBear/Queues',
        service: 'api',
        environment: 'prod',
        logQueueFailures: true,
      }
    );
  }

  private resolveActivityTypeFromRoutineType(routineType?: string): ActivityType | undefined {
    if (!routineType) return undefined;
    const normalized = String(routineType).trim().toLowerCase();
    if (normalized === 'morning') return ActivityType.morning;
    if (normalized === 'evening') return ActivityType.evening;
    if (normalized === 'break') return ActivityType.break;
    if (normalized === 'breaking') return ActivityType.break;
    if (normalized === 'library') return ActivityType.library;
    if (normalized === 'standalone') return ActivityType.standalone;
    return undefined;
  }
}
