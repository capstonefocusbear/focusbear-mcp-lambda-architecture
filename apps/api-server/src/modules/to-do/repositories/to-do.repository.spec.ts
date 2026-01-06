import { Test } from '@nestjs/testing';
import { Connection, QueryBuilder } from 'typeorm';
import { ToDoRepository } from './to-do.repository';
import { ToDo } from '../entities/to-do.entity';
import { PageOrder } from '../../../shared/domain/page-order.enum';
import { ToDoStatus } from '../domain/to-do-status.enum';
import { GetToDosQueryDto } from '../dto/get-to-dos-query.dto';

describe('ToDoRepository - SQL Query Testing', () => {
  let toDoRepository: ToDoRepository;
  let mockConnection: any;
  let mockQueryBuilder: any;
  let mockRepository: any;

  beforeEach(async () => {
    // Create mock query builder with proper typing
    mockQueryBuilder = {
      createQueryBuilder: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      distinct: jest.fn().mockReturnThis(),
      clone: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
      getManyAndCount: jest.fn(),
      getRawAndEntities: jest.fn(),
      getCount: jest.fn(),
    } as unknown as jest.Mocked<QueryBuilder<ToDo>>;

    // Create mock repository
    mockRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    // Create mock connection
    mockConnection = {
      getRepository: jest.fn().mockReturnValue(mockRepository),
    } as unknown as jest.Mocked<Connection>;

    const moduleRef = await Test.createTestingModule({
      providers: [
        ToDoRepository,
        {
          provide: Connection,
          useValue: mockConnection,
        },
      ],
    }).compile();

    toDoRepository = moduleRef.get<ToDoRepository>(ToDoRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserToDos - SQL Query Building', () => {
    const userId = 'test-user-id';
    const baseQueryDto: GetToDosQueryDto = {
      take: 10,
      skip: 0,
      order: PageOrder.DESC,
    };

    it('should build correct base query with scoring formula', async () => {
      const mockResults = [
        {
          id: '1',
          title: 'Test Todo',
        },
      ];

      mockQueryBuilder.getRawAndEntities.mockResolvedValue({
        entities: mockResults,
        raw: mockResults.map((result) => ({
          to_do_id: result.id,
          top_score: 5.5,
        })),
      });

      // Mock the count query
      mockQueryBuilder.getCount.mockResolvedValue(25);

      await toDoRepository.getUserToDos(userId, baseQueryDto);

      // Verify the base query structure
      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('to_do');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('to_do.tags', 'tags');
      expect(mockQueryBuilder.select).toHaveBeenCalledWith([
        'to_do.id',
        'to_do.title',
        'to_do.details',
        'to_do.due_date',
        'to_do.eisenhower_quadrant',
        'to_do.status',
        'to_do.focus_type',
        'to_do.external_task_id',
        'to_do.external_task_metadata',
        'to_do.created_at',
        'to_do.objective',
        'tags.id',
        'tags.text',
        'to_do.duration',
        'to_do.icon',
        'to_do.perspiration_level',
        'to_do.outcome',
      ]);

      // Verify the scoring formula is added
      expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith(expect.stringContaining('CASE'), 'top_score');

      // Verify pagination
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);

      // Verify user filter
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('to_do.user_id = :user_id', { user_id: userId });

      // Verify ordering
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('top_score', 'DESC');
    });

    it('should return correct total count from separate count query', async () => {
      const mockResults = [
        { id: '1', title: 'Test Todo 1' },
        { id: '2', title: 'Test Todo 2' },
      ];

      mockQueryBuilder.getRawAndEntities.mockResolvedValue({
        entities: mockResults,
        raw: mockResults.map((result) => ({
          to_do_id: result.id,
          top_score: 5.5,
        })),
      });

      // Mock the count query
      mockQueryBuilder.getCount.mockResolvedValue(25);

      const [todos, totalCount] = await toDoRepository.getUserToDos(userId, baseQueryDto);

      expect(todos).toHaveLength(2);
      expect(totalCount).toBe(25);
      expect(todos[0]).toHaveProperty('top_score', 5.5);

      // Verify count query was called
      expect(mockQueryBuilder.select).toHaveBeenCalledWith('to_do.id');
      expect(mockQueryBuilder.distinct).toHaveBeenCalledWith(true);
      expect(mockQueryBuilder.getCount).toHaveBeenCalled();
    });

    it('should add status filter when provided', async () => {
      const queryDto = { ...baseQueryDto, status: ToDoStatus.IN_PROGRESS, skip: 0 };
      mockQueryBuilder.getRawAndEntities.mockResolvedValue({
        entities: [],
        raw: [],
      });

      await toDoRepository.getUserToDos(userId, queryDto);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('to_do.status = :status', {
        status: ToDoStatus.IN_PROGRESS,
      });
    });

    it('should exclude completed todos when no status filter', async () => {
      mockQueryBuilder.getRawAndEntities.mockResolvedValue({
        entities: [],
        raw: [],
      });

      await toDoRepository.getUserToDos(userId, baseQueryDto);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith("to_do.status != 'COMPLETED'");
    });

    it('should add eisenhower quadrant filter when provided', async () => {
      const queryDto = { ...baseQueryDto, eisenhower_quadrant: 2, skip: 0 };
      mockQueryBuilder.getRawAndEntities.mockResolvedValue({
        entities: [],
        raw: [],
      });

      await toDoRepository.getUserToDos(userId, queryDto);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('to_do.eisenhower_quadrant = :eisenhower_quadrant', {
        eisenhower_quadrant: 2,
      });
    });

    it('should add tag filter when provided', async () => {
      const queryDto = { ...baseQueryDto, tag_id: 'tag-123', skip: 0 };
      mockQueryBuilder.getRawAndEntities.mockResolvedValue({
        entities: [],
        raw: [],
      });

      await toDoRepository.getUserToDos(userId, queryDto);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('tags.id = :tag_id', { tag_id: 'tag-123' });
    });

    it('should add perspiration level filters when provided', async () => {
      const queryDto = {
        ...baseQueryDto,
        perspiration_gte: 3,
        perspiration_lte: 7,
        skip: 0,
      };
      mockQueryBuilder.getRawAndEntities.mockResolvedValue({
        entities: [],
        raw: [],
      });

      await toDoRepository.getUserToDos(userId, queryDto);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('to_do.perspiration_level >= :perspiration_gte', {
        perspiration_gte: 3,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('to_do.perspiration_level <= :perspiration_lte', {
        perspiration_lte: 7,
      });
    });

    it('should add synced project filter when provided', async () => {
      const queryDto = { ...baseQueryDto, synced_project_id: 'project-123', skip: 0 };
      mockQueryBuilder.getRawAndEntities.mockResolvedValue({
        entities: [],
        raw: [],
      });

      await toDoRepository.getUserToDos(userId, queryDto);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('to_do.synced_project_id = :synced_project_id', {
        synced_project_id: 'project-123',
      });
    });

    it('should order by ASC when specified', async () => {
      const queryDto = { ...baseQueryDto, order: PageOrder.ASC, skip: 0 };
      mockQueryBuilder.getRawAndEntities.mockResolvedValue({
        entities: [],
        raw: [],
      });

      await toDoRepository.getUserToDos(userId, queryDto);

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('top_score', 'ASC');
    });

    it('should correctly map subtasks from raw query results', async () => {
      const mockSubtasks = [
        { name: 'Subtask 1', is_completed: false },
        { name: 'Subtask 2', is_completed: true },
      ];

      const mockResults = [
        {
          id: 'todo-1',
          title: 'Test Todo',
        },
      ];

      mockQueryBuilder.getRawAndEntities.mockResolvedValue({
        entities: mockResults,
        raw: [
          {
            to_do_id: 'todo-1',
            top_score: 5.5,
            raw_subtasks: mockSubtasks,
          },
        ],
      });

      mockQueryBuilder.getCount.mockResolvedValue(1);

      const [todos] = await toDoRepository.getUserToDos(userId, baseQueryDto);

      expect(todos[0]).toHaveProperty('subtasks', mockSubtasks);
      expect(todos[0]).toHaveProperty('top_score', 5.5);
    });

    it('should handle null subtasks from raw query results', async () => {
      const mockResults = [
        {
          id: 'todo-1',
          title: 'Test Todo',
        },
      ];

      mockQueryBuilder.getRawAndEntities.mockResolvedValue({
        entities: mockResults,
        raw: [
          {
            to_do_id: 'todo-1',
            top_score: 5.5,
            raw_subtasks: null,
          },
        ],
      });

      mockQueryBuilder.getCount.mockResolvedValue(1);

      const [todos] = await toDoRepository.getUserToDos(userId, baseQueryDto);

      expect(todos[0]).toHaveProperty('subtasks', null);
    });

    it('should handle multiple todos with different subtasks', async () => {
      const mockSubtasks1 = [{ name: 'Subtask 1', is_completed: false }];
      const mockSubtasks2 = [
        { name: 'Subtask A', is_completed: true },
        { name: 'Subtask B', is_completed: false },
      ];

      const mockResults = [
        { id: 'todo-1', title: 'Test Todo 1' },
        { id: 'todo-2', title: 'Test Todo 2' },
      ];

      mockQueryBuilder.getRawAndEntities.mockResolvedValue({
        entities: mockResults,
        raw: [
          {
            to_do_id: 'todo-1',
            top_score: 5.5,
            raw_subtasks: mockSubtasks1,
          },
          {
            to_do_id: 'todo-2',
            top_score: 3.2,
            raw_subtasks: mockSubtasks2,
          },
        ],
      });

      mockQueryBuilder.getCount.mockResolvedValue(2);

      const [todos] = await toDoRepository.getUserToDos(userId, baseQueryDto);

      expect(todos[0]).toHaveProperty('subtasks', mockSubtasks1);
      expect(todos[1]).toHaveProperty('subtasks', mockSubtasks2);
      expect(todos[0]).toHaveProperty('top_score', 5.5);
      expect(todos[1]).toHaveProperty('top_score', 3.2);
    });

    it('should use addSelect to fetch raw_subtasks separately', async () => {
      mockQueryBuilder.getRawAndEntities.mockResolvedValue({
        entities: [],
        raw: [],
      });

      await toDoRepository.getUserToDos(userId, baseQueryDto);

      // Verify that raw_subtasks is selected separately using addSelect
      expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith('to_do.subtasks', 'raw_subtasks');
    });

    it('should not include subtasks in main select statement', async () => {
      mockQueryBuilder.getRawAndEntities.mockResolvedValue({
        entities: [],
        raw: [],
      });

      await toDoRepository.getUserToDos(userId, baseQueryDto);

      // Verify that the main select does NOT include 'to_do.subtasks'
      const selectCall = mockQueryBuilder.select.mock.calls[0][0];
      expect(selectCall).not.toContain('to_do.subtasks');
    });
  });

  describe('searchUserToDos - SQL Query Building', () => {
    const userId = 'test-user-id';
    const searchDto = { title: 'test', take: 5 };

    it('should build correct search query', async () => {
      const mockResults = [
        {
          id: '1',
          title: 'Test Todo',
        },
      ];

      mockQueryBuilder.getMany.mockResolvedValue(mockResults);

      await toDoRepository.searchUserToDos(searchDto, userId);

      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('to_do');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('to_do.tags', 'tags');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('to_do.user_id = :user_id', { user_id: userId });
    });
  });

  describe('getUserRecentToDos - SQL Query Building', () => {
    const userId = 'test-user-id';
    const recentDto = {
      updated_at: '2024-01-01',
      status: [ToDoStatus.IN_PROGRESS],
      take: 10,
    };

    it('should build correct recent todos query', async () => {
      const mockResults = [
        {
          id: '1',
          title: 'Recent Todo',
        },
      ];

      mockQueryBuilder.getMany.mockResolvedValue(mockResults);

      await toDoRepository.getUserRecentToDos(recentDto, userId);

      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('to_do');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('to_do.tags', 'tags');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('to_do.user_id = :user_id', { user_id: userId });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('to_do.updated_at >= :updated_at', {
        updated_at: recentDto.updated_at,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('to_do.status IN (:...status)', {
        status: recentDto.status,
      });
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('to_do.updated_at', 'DESC');
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
    });
  });
});
