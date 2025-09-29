import { Process, Processor } from '@nestjs/bull';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { Job } from 'bull';
import { OpenAIService } from '@app/openai';
import { R2Service } from '@app/r2';
import axios from 'axios';
import { toFile } from 'openai/uploads';
import { extname } from 'path';
import { AsyncTaskService } from '../../async-task/services/async-task.service';
import { AsyncTaskStatus } from '../../async-task/domain/async-task-status.enum';
import { BullQueues, BullWorkers, S3_BUCKET_TODO_AUDIOS } from '../../../shared/utils/constants';

@Processor(BullQueues.TODO_AUDIO)
export class TodoAudioConsumer {
  constructor(
    @InjectSentry() private readonly sentryService: SentryService,
    private readonly openAIService: OpenAIService,
    private readonly r2Service: R2Service,
    private readonly asyncTaskService: AsyncTaskService,
  ) {}

  @Process(BullWorkers.PROCESS_TODO_AUDIO)
  async processTodoAudio(
    job: Job<{
      userId: string;
      audioKey: string;
      asyncTaskId?: string;
    }>,
  ) {
    const { userId, audioKey, asyncTaskId } = job.data;

    const baseMetadata = {
      taskType: 'todo-audio-processing',
      userId,
      audioKey,
    };

    await this.asyncTaskService.updateStatusWithMetadata(asyncTaskId, AsyncTaskStatus.PROCESSING, baseMetadata, {
      processingStarted: new Date(),
    });

    try {
      const audioUrl = await this.r2Service.getPresignedUrl(S3_BUCKET_TODO_AUDIOS, audioKey);
      const resp = await axios.get<ArrayBuffer>(audioUrl, { responseType: 'arraybuffer', timeout: 120000 });
      const buffer = Buffer.from(resp.data);
      const rawExt = extname(audioKey).toLowerCase();
      const allowed = new Set(['.flac', '.m4a', '.mp3', '.mp4', '.mpeg', '.mpga', '.oga', '.ogg', '.wav', '.webm']);
      const safeExt = allowed.has(rawExt) ? rawExt : '.mp3';
      const fileName = `todo-audio${safeExt}`;
      const file = await toFile(buffer, fileName);
      const transcript = await this.openAIService.transcribeAudioToText(file as unknown as File);
      const tasks = await this.openAIService.createDraftTodosFromTranscript(transcript);

      await this.asyncTaskService.updateStatusWithMetadata(asyncTaskId, AsyncTaskStatus.COMPLETED, baseMetadata, {
        processingCompleted: new Date(),
        aiResponse: tasks,
      });

      return tasks;
    } catch (error) {
      await this.asyncTaskService.updateStatusWithMetadata(asyncTaskId, AsyncTaskStatus.FAILED, baseMetadata, {
        processingFailed: new Date(),
        audioKey,
      });
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }
}
