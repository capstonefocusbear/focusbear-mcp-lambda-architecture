import { Process, Processor } from '@nestjs/bull';
import { InjectSentry, SentryService } from '@app/observability';
import { Job } from 'bull';
import { R2Service } from '@app/r2';
import { OpenAIService } from '@app/openai';
import axios from 'axios';
import { toFile } from 'openai/uploads';
import { extname } from 'path';
import { AsyncTaskService } from '../../async-task/services/async-task.service';
import { AsyncTaskStatus } from '../../async-task/domain/async-task-status.enum';
import { HabitImportExtractionService } from '../services/habit-import-extraction.service';
import { HabitImportJobData } from '../dto/import-habits-from-media.dto';
import { BullQueues, BullWorkers, S3_BUCKET_HABIT_IMPORTS } from '../../../shared/utils/constants';

@Processor(BullQueues.HABIT_IMPORT)
export class HabitImportConsumer {
  constructor(
    @InjectSentry() private readonly sentryService: SentryService,
    private readonly r2Service: R2Service,
    private readonly openAIService: OpenAIService,
    private readonly asyncTaskService: AsyncTaskService,
    private readonly habitImportExtractionService: HabitImportExtractionService,
  ) {}

  @Process(BullWorkers.PROCESS_HABIT_IMPORT)
  async processHabitImport(job: Job<HabitImportJobData>) {
    const { asyncTaskId, userId, mediaKey, mediaType, routineType } = job.data;

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
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Processing habit import',
        data: { userId, mediaKey, mediaType },
      });

      // 1. Fetch file from R2
      const fileUrl = await this.r2Service.getPresignedUrl(S3_BUCKET_HABIT_IMPORTS, mediaKey);

      // 2. Extract habits based on media type
      let extractedHabits;
      if (mediaType === 'image') {
        // Fetch image and convert to base64
        const imageResponse = await axios.get(fileUrl, {
          responseType: 'arraybuffer',
          timeout: 120000,
        });
        const contentTypeHeader = imageResponse.headers?.['content-type'] as string | undefined;
        const base64 = Buffer.from(imageResponse.data, 'binary').toString('base64');
        const inferredMimeType = this.resolveImageMimeType(mediaKey, contentTypeHeader);
        const imageBuffer = `data:${inferredMimeType};base64,${base64}`;
        extractedHabits = await this.habitImportExtractionService.extractHabitsFromImage(imageBuffer);
      } else {
        // Audio: fetch, transcribe, then extract
        const audioResponse = await axios.get<ArrayBuffer>(fileUrl, {
          responseType: 'arraybuffer',
          timeout: 120000,
        });
        const buffer = Buffer.from(audioResponse.data);
        const rawExt = extname(mediaKey).toLowerCase();
        const allowed = new Set(['.flac', '.m4a', '.mp3', '.mp4', '.mpeg', '.mpga', '.oga', '.ogg', '.wav', '.webm']);
        const safeExt = allowed.has(rawExt) ? rawExt : '.mp3';
        const fileName = `habit-import-audio${safeExt}`;
        const file = await toFile(buffer, fileName);

        // Transcribe audio to text
        const transcript = await this.openAIService.transcribeAudioToText(file as unknown as File);

        if (!transcript || transcript.trim().length === 0) {
          throw new Error('Empty transcript from audio');
        }

        // Extract habits from transcript
        extractedHabits = await this.habitImportExtractionService.extractHabitsFromTranscript(transcript);
      }

      if (!extractedHabits || extractedHabits.length === 0) {
        await this.asyncTaskService.updateStatusWithMetadata(asyncTaskId, AsyncTaskStatus.COMPLETED, baseMetadata, {
          processingCompleted: new Date(),
          extractedCount: 0,
          matchedCount: 0,
          unmatchedCount: 0,
          result: [],
        });
        return [];
      }

      // 3. Match extracted habits against library
      const results = await this.habitImportExtractionService.matchExtractedHabits(extractedHabits);

      // 4. Log unmatched habits to habit_library_requests
      await this.habitImportExtractionService.logUnmatchedHabits(results, userId, {
        asyncTaskId,
        mediaType,
        routineType,
      });

      const matchedCount = results.filter((r) => r.matched).length;
      const unmatchedCount = results.filter((r) => !r.matched).length;

      // 5. Update AsyncTask with results
      await this.asyncTaskService.updateStatusWithMetadata(asyncTaskId, AsyncTaskStatus.COMPLETED, baseMetadata, {
        processingCompleted: new Date(),
        extractedCount: extractedHabits.length,
        matchedCount,
        unmatchedCount,
        result: results,
      });

      return results;
    } catch (error) {
      // Update status to FAILED
      await this.asyncTaskService.updateStatusWithMetadata(asyncTaskId, AsyncTaskStatus.FAILED, baseMetadata, {
        processingFailed: new Date(),
        error: error.message,
      });

      this.sentryService.instance().captureException(error, {
        level: 'error',
        extra: { userId, mediaKey, mediaType, asyncTaskId },
      });

      throw error;
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
}
