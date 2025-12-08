import { Test } from '@nestjs/testing';
import { Connection, FindOperator, Repository } from 'typeorm';
import { ActivityTemplateRepository } from './activity-template.repository';
import { ActivityTemplate } from '../entity/activity-template.entity';
import { ActivityType } from '../../activity/domain/activity-type.enum';

describe('ActivityTemplateRepository', () => {
  let repository: ActivityTemplateRepository;
  let mockConnection: Pick<Connection, 'getRepository'>;
  let mockOrm: Pick<Repository<ActivityTemplate>, 'find'>;

  beforeEach(async () => {
    mockOrm = {
      find: jest.fn().mockResolvedValue([]),
    } as unknown as Pick<Repository<ActivityTemplate>, 'find'>;

    mockConnection = {
      getRepository: jest.fn().mockReturnValue(mockOrm),
    } as unknown as Pick<Connection, 'getRepository'>;

    const moduleRef = await Test.createTestingModule({
      providers: [
        ActivityTemplateRepository,
        {
          provide: Connection,
          useValue: mockConnection,
        },
      ],
    }).compile();

    repository = moduleRef.get(ActivityTemplateRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('includes break templates when fetching items for embedding sync', async () => {
    await repository.getTemplatesForEmbeddingSync();

    expect(mockOrm.find).toHaveBeenCalledTimes(1);

    const [{ where }] = (mockOrm.find as jest.Mock).mock.calls[0];
    const activityTypeFilter = where.activity_type as FindOperator<ActivityType>;
    const values =
      (activityTypeFilter as any)?.value ??
      // eslint-disable-next-line no-underscore-dangle
      (activityTypeFilter as any)?._value ??
      // eslint-disable-next-line no-underscore-dangle
      (activityTypeFilter as any)?._value ??
      [];

    expect(values).toEqual(
      expect.arrayContaining([ActivityType.morning, ActivityType.evening, ActivityType.library, ActivityType.break]),
    );
  });
});
