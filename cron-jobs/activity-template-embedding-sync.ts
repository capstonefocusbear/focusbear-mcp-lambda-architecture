/* eslint-disable no-console */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../apps/api-server/src/app.module';
import { ActivityTemplateEmbeddingSyncService } from '../apps/api-server/src/modules/activity-template/services/activity-template-embedding-sync.service';
import { runCronWithTelemetry, captureErrorWithContext } from './sentry';
import { withTimeout } from '../apps/api-server/src/shared/utils/helpers';
import { CRON_JOB_TIMEOUT_MS } from '../apps/api-server/src/shared/utils/constants';

async function runActivityTemplateEmbeddingSync() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const syncService = app.get(ActivityTemplateEmbeddingSyncService);

  try {
    console.log('Starting activity template embedding sync...');
    const summary = await syncService.syncAll();
    console.log(
      `Embedding sync completed. Processed: ${summary.processed}, upserted: ${summary.upserted}, skipped: ${summary.skipped}, errors: ${summary.errors}`,
    );
    return summary;
  } catch (error) {
    captureErrorWithContext(
      error,
      {
        operation: 'runActivityTemplateEmbeddingSync',
      },
      {
        logLevel: 'error',
      },
    );
    console.error('Failed to complete activity template embedding sync', error);
    throw error;
  } finally {
    await app.close();
  }
}

if (require.main === module) {
  runCronWithTelemetry('activity-template-embedding-sync', () =>
    withTimeout(runActivityTemplateEmbeddingSync(), CRON_JOB_TIMEOUT_MS),
  );
}

export default runActivityTemplateEmbeddingSync;
