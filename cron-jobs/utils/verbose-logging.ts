import { DataSource } from 'typeorm';
import { CronJobDataSource } from '../data-source';
import { User } from '../../apps/api-server/src/modules/user/entities/user.entity';

type LoggerLike = Pick<Console, 'log'>;

const verboseLoggingCache = new Map<string, boolean>();

export const clearCronVerboseLoggingCache = (userId?: string): void => {
  if (userId) {
    verboseLoggingCache.delete(userId);
    return;
  }
  verboseLoggingCache.clear();
};

export const getCronUserVerboseLoggingFlag = async (
  user_id: string,
  dataSource: DataSource = CronJobDataSource,
): Promise<boolean> => {
  const cachedValue = verboseLoggingCache.get(user_id);
  if (cachedValue !== undefined) {
    return cachedValue;
  }

  const userRepository = dataSource.getRepository(User);
  const user = await userRepository.findOneBy({ id: user_id });
  const isVerbose = user?.verbose_logging ?? false;
  verboseLoggingCache.set(user_id, isVerbose);
  return isVerbose;
};

export const logVerboselyIfUserHasVerboseLoggingEnabled = async (
  user_id: string,
  logArgs: any[],
  {
    dataSource = CronJobDataSource,
    logger = console,
  }: {
    dataSource?: DataSource;
    logger?: LoggerLike;
  } = {},
): Promise<void> => {
  try {
    const isVerboseLoggingAllowed = await getCronUserVerboseLoggingFlag(user_id, dataSource);
    if (!isVerboseLoggingAllowed) {
      return;
    }

    if (!logArgs?.length) {
      logger.log('');
      return;
    }

    const [first, ...rest] = logArgs;
    logger.log(first, ...rest);
  } catch (_error) {
    // silently swallow errors to avoid taking down cron jobs due to logging issues
  }
};
