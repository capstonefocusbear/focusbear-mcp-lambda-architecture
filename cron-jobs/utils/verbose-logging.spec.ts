import { DataSource } from 'typeorm';
import {
  clearCronVerboseLoggingCache,
  logVerboselyIfUserHasVerboseLoggingEnabled,
} from './verbose-logging';

describe('Cron Verbose Logging Utils', () => {
  const userId = 'user-id';
  let findOneByMock: jest.Mock;
  let getRepositoryMock: jest.Mock;
  let mockDataSource: Partial<DataSource>;
  let loggerMock: { log: jest.Mock };

  beforeEach(() => {
    findOneByMock = jest.fn();
    getRepositoryMock = jest.fn().mockReturnValue({ findOneBy: findOneByMock });
    mockDataSource = {
      getRepository: getRepositoryMock as any,
    };
    loggerMock = { log: jest.fn() };
    clearCronVerboseLoggingCache();
  });

  it('logs messages when verbose logging is enabled', async () => {
    findOneByMock.mockResolvedValue({ id: userId, verbose_logging: true });

    await logVerboselyIfUserHasVerboseLoggingEnabled(
      userId,
      ['Test message', { foo: 'bar' }],
      {
        dataSource: mockDataSource as DataSource,
        logger: loggerMock,
      },
    );

    expect(loggerMock.log).toHaveBeenCalledTimes(1);
    expect(loggerMock.log).toHaveBeenCalledWith('Test message', { foo: 'bar' });
    expect(findOneByMock).toHaveBeenCalledTimes(1);
  });

  it('does not log when verbose logging is disabled', async () => {
    findOneByMock.mockResolvedValue({ id: userId, verbose_logging: false });

    await logVerboselyIfUserHasVerboseLoggingEnabled(
      userId,
      ['Should not log'],
      {
        dataSource: mockDataSource as DataSource,
        logger: loggerMock,
      },
    );

    expect(loggerMock.log).not.toHaveBeenCalled();
  });

  it('caches verbose logging results to avoid duplicate queries', async () => {
    findOneByMock.mockResolvedValue({ id: userId, verbose_logging: true });

    await logVerboselyIfUserHasVerboseLoggingEnabled(
      userId,
      ['First log'],
      {
        dataSource: mockDataSource as DataSource,
        logger: loggerMock,
      },
    );
    await logVerboselyIfUserHasVerboseLoggingEnabled(
      userId,
      ['Second log'],
      {
        dataSource: mockDataSource as DataSource,
        logger: loggerMock,
      },
    );

    expect(findOneByMock).toHaveBeenCalledTimes(1);
    expect(loggerMock.log).toHaveBeenCalledTimes(2);
  });

  it('fails silently when fetching verbose logging flag fails', async () => {
    findOneByMock.mockRejectedValue(new Error('Database error'));

    await expect(
      logVerboselyIfUserHasVerboseLoggingEnabled(
        userId,
        ['Test message'],
        {
          dataSource: mockDataSource as DataSource,
          logger: loggerMock,
        },
      ),
    ).resolves.not.toThrow();

    expect(loggerMock.log).not.toHaveBeenCalled();
  });
});
