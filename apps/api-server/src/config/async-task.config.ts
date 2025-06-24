import { registerAs } from '@nestjs/config';

export const asyncTaskConfig = registerAs('asyncTask', () => ({
  defaultTimeoutSeconds: 300, // 5 minutes default
  maxTimeoutSeconds: 3600, // 1 hour max
  expirationCheckIntervalSeconds: 60, // Check every minute
  taskTypeTimeouts: {
    'usage-image-processing': 600, // 10 minutes
    'data-export': 1800, // 30 minutes
    'report-generation': 900, // 15 minutes
    'bulk-import': 1800, // 40 minutes
  },
}));
