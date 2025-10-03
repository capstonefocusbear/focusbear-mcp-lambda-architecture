import { BlockingScheduleRepository } from './blocking-schedule.repository';

describe('BlockingScheduleRepository.findActiveSchedulesForUser', () => {
  function createRepoWithQBMocks() {
    const getMany = jest.fn().mockResolvedValue([]);
    const andWhere = jest.fn().mockReturnThis();
    const where = jest.fn().mockReturnThis();
    const leftJoinAndSelect = jest.fn().mockReturnThis();
    const orderBy = jest.fn().mockReturnThis();

    const qbMock = {
      leftJoinAndSelect,
      where,
      andWhere,
      orderBy,
      getMany,
    } as any;

    const createQueryBuilder = jest.fn().mockReturnValue(qbMock);

    const ormMock = {
      createQueryBuilder,
    } as any;

    const connectionMock = {
      getRepository: jest.fn().mockReturnValue(ormMock),
    } as any;

    const repo = new BlockingScheduleRepository(connectionMock);
    return { repo, qbMock, andWhere, getMany };
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('matches same-day schedules when currentTime is between start and end', async () => {
    const { repo, andWhere, getMany } = createRepoWithQBMocks();
    await repo.findActiveSchedulesForUser('user-1', '10:00', 2);

    expect(andWhere).toHaveBeenCalledTimes(1);
    const [sql, params] = andWhere.mock.calls[0];
    expect(sql).toContain('blocking_schedule.start_time <= :currentTime');
    expect(sql).toContain('blocking_schedule.end_time >= :currentTime');
    expect(params).toMatchObject({ currentTime: '10:00', currentDayArray: [2], prevDayArray: [1] });
    expect(getMany).toHaveBeenCalled();
  });

  it('matches overnight schedules late night part on current day (e.g., 22:00-06:00 at 23:00)', async () => {
    const { repo, andWhere } = createRepoWithQBMocks();
    await repo.findActiveSchedulesForUser('user-1', '23:00', 5);

    const [sql, params] = andWhere.mock.calls[0];
    expect(sql).toContain('blocking_schedule.start_time > blocking_schedule.end_time');
    expect(sql).toContain(':currentTime >= blocking_schedule.start_time');
    expect(params).toMatchObject({ currentTime: '23:00', currentDayArray: [5], prevDayArray: [4] });
  });

  it('matches overnight schedules after midnight part on previous day (e.g., 22:00-06:00 at 03:00)', async () => {
    const { repo, andWhere } = createRepoWithQBMocks();
    await repo.findActiveSchedulesForUser('user-1', '03:00', 0);

    const [sql, params] = andWhere.mock.calls[0];
    expect(sql).toContain('blocking_schedule.start_time > blocking_schedule.end_time');
    expect(sql).toContain(':currentTime <= blocking_schedule.end_time');
    // prevDayArray should be [6] when currentDay is 0 (Sunday)
    expect(params).toMatchObject({ currentTime: '03:00', currentDayArray: [0], prevDayArray: [6] });
  });
});
