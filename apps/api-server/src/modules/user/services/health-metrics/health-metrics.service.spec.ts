import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HealthMetricsService } from './health-metrics.service';
import { HealthMetrics, HealthMetricType } from '../../entities/health-metrics.entity';
import { StudyParticipant } from '../../entities/study-participant.entity';
import { SyncHealthMetricsDto } from '../../dto/sync-health-metrics.dto';

describe('HealthMetricsService', () => {
  let service: HealthMetricsService;

  const mockHealthMetricsRepository = {
    findOne: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
  };

  const mockStudyParticipantRepository = {
    findOne: jest.fn(),
    update: jest.fn(),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthMetricsService,
        {
          provide: getRepositoryToken(HealthMetrics),
          useValue: mockHealthMetricsRepository,
        },
        {
          provide: getRepositoryToken(StudyParticipant),
          useValue: mockStudyParticipantRepository,
        },
      ],
    }).compile();

    service = module.get<HealthMetricsService>(HealthMetricsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('syncHealthMetrics', () => {
    const userId = 'test-user-id';
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    it('positive: should successfully update existing health metrics', async () => {
      const existingMetric = {
        id: 'existing-metric-id',
        userId,
        metricType: HealthMetricType.HOURS_OF_SLEEP,
        dayOfTracking: today,
        metricValue: 7,
      };

      const syncDto: SyncHealthMetricsDto = {
        healthMetrics: [
          {
            metricType: HealthMetricType.HOURS_OF_SLEEP,
            dayOfTracking: today,
            metricValue: 8,
          },
        ],
      };

      mockHealthMetricsRepository.findOne.mockResolvedValueOnce(existingMetric);
      mockStudyParticipantRepository.findOne.mockResolvedValueOnce(null);

      await service.syncHealthMetrics(userId, syncDto);

      expect(mockHealthMetricsRepository.findOne).toHaveBeenCalledWith({
        where: {
          userId,
          metricType: HealthMetricType.HOURS_OF_SLEEP,
          dayOfTracking: today,
        },
      });

      expect(mockHealthMetricsRepository.update).toHaveBeenCalledWith(existingMetric.id, {
        metricValue: 8,
      });

      expect(mockHealthMetricsRepository.save).not.toHaveBeenCalled();
    });

    it('positive: should successfully create new health metrics when none exist', async () => {
      const syncDto: SyncHealthMetricsDto = {
        healthMetrics: [
          {
            metricType: HealthMetricType.MINUTES_OF_MOVEMENT,
            dayOfTracking: today,
            metricValue: 45,
          },
        ],
      };

      mockHealthMetricsRepository.findOne.mockResolvedValueOnce(null);
      mockStudyParticipantRepository.findOne.mockResolvedValueOnce(null);

      await service.syncHealthMetrics(userId, syncDto);

      expect(mockHealthMetricsRepository.save).toHaveBeenCalledWith({
        userId,
        metricType: HealthMetricType.MINUTES_OF_MOVEMENT,
        dayOfTracking: today,
        metricValue: 45,
      });

      expect(mockHealthMetricsRepository.update).not.toHaveBeenCalled();
    });

    it('positive: should update study participant healthDataLastReceived when participant exists', async () => {
      const studyParticipant = {
        id: 'participant-id',
        userId,
        participantCode: 'STUDY123',
        healthDataLastReceived: null,
      };

      const syncDto: SyncHealthMetricsDto = {
        healthMetrics: [
          {
            metricType: HealthMetricType.NUMBER_OF_STEPS_MOVED,
            dayOfTracking: today,
            metricValue: 10000,
          },
        ],
      };

      mockHealthMetricsRepository.findOne.mockResolvedValueOnce(null);
      mockStudyParticipantRepository.findOne.mockResolvedValueOnce(studyParticipant);

      await service.syncHealthMetrics(userId, syncDto);

      expect(mockStudyParticipantRepository.update).toHaveBeenCalledWith(studyParticipant.id, {
        healthDataLastReceived: expect.toBeDate(),
      });
    });

    it('positive: should handle multiple health metrics in a single sync operation', async () => {
      const syncDto: SyncHealthMetricsDto = {
        healthMetrics: [
          {
            metricType: HealthMetricType.HOURS_OF_SLEEP,
            dayOfTracking: today,
            metricValue: 7.5,
          },
          {
            metricType: HealthMetricType.MINUTES_OF_MOVEMENT,
            dayOfTracking: today,
            metricValue: 30,
          },
          {
            metricType: HealthMetricType.NUMBER_OF_STEPS_MOVED,
            dayOfTracking: today,
            metricValue: 8500,
          },
        ],
      };

      mockHealthMetricsRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockStudyParticipantRepository.findOne.mockResolvedValueOnce(null);

      await service.syncHealthMetrics(userId, syncDto);

      expect(mockHealthMetricsRepository.save).toHaveBeenCalledTimes(3);
      expect(mockHealthMetricsRepository.save).toHaveBeenNthCalledWith(1, {
        userId,
        metricType: HealthMetricType.HOURS_OF_SLEEP,
        dayOfTracking: today,
        metricValue: 7.5,
      });
      expect(mockHealthMetricsRepository.save).toHaveBeenNthCalledWith(2, {
        userId,
        metricType: HealthMetricType.MINUTES_OF_MOVEMENT,
        dayOfTracking: today,
        metricValue: 30,
      });
      expect(mockHealthMetricsRepository.save).toHaveBeenNthCalledWith(3, {
        userId,
        metricType: HealthMetricType.NUMBER_OF_STEPS_MOVED,
        dayOfTracking: today,
        metricValue: 8500,
      });
    });

    it('positive: should handle when study participant does not exist', async () => {
      const syncDto: SyncHealthMetricsDto = {
        healthMetrics: [
          {
            metricType: HealthMetricType.HOURS_OF_SLEEP,
            dayOfTracking: today,
            metricValue: 8,
          },
        ],
      };

      mockHealthMetricsRepository.findOne.mockResolvedValueOnce(null);
      mockStudyParticipantRepository.findOne.mockResolvedValueOnce(null);

      await service.syncHealthMetrics(userId, syncDto);

      expect(mockStudyParticipantRepository.update).not.toHaveBeenCalled();
    });

    it('positive: should handle empty healthMetrics array', async () => {
      const syncDto: SyncHealthMetricsDto = {
        healthMetrics: [],
      };

      mockStudyParticipantRepository.findOne.mockResolvedValueOnce(null);

      await service.syncHealthMetrics(userId, syncDto);

      expect(mockHealthMetricsRepository.findOne).not.toHaveBeenCalled();
      expect(mockHealthMetricsRepository.update).not.toHaveBeenCalled();
      expect(mockHealthMetricsRepository.save).not.toHaveBeenCalled();
    });

    it('positive: should handle mixed scenarios where some metrics exist and some do not', async () => {
      const existingMetric = {
        id: 'existing-metric-id',
        userId,
        metricType: HealthMetricType.HOURS_OF_SLEEP,
        dayOfTracking: today,
        metricValue: 6,
      };

      const syncDto: SyncHealthMetricsDto = {
        healthMetrics: [
          {
            metricType: HealthMetricType.HOURS_OF_SLEEP,
            dayOfTracking: today,
            metricValue: 8,
          },
          {
            metricType: HealthMetricType.MINUTES_OF_MOVEMENT,
            dayOfTracking: today,
            metricValue: 45,
          },
        ],
      };

      mockHealthMetricsRepository.findOne.mockResolvedValueOnce(existingMetric).mockResolvedValueOnce(null);
      mockStudyParticipantRepository.findOne.mockResolvedValueOnce(null);

      await service.syncHealthMetrics(userId, syncDto);

      expect(mockHealthMetricsRepository.update).toHaveBeenCalledWith(existingMetric.id, {
        metricValue: 8,
      });

      expect(mockHealthMetricsRepository.save).toHaveBeenCalledWith({
        userId,
        metricType: HealthMetricType.MINUTES_OF_MOVEMENT,
        dayOfTracking: today,
        metricValue: 45,
      });
    });
  });
});
