import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SENTRY_TOKEN } from '@app/observability';
import { randomUUID } from 'crypto';
import { BlockingScheduleService } from './blocking-schedule.service';
import { BlockingScheduleRepository } from '../../repositories/blocking-schedule.repository';
import { FocusModeRepository } from '../../repositories/focus-mode.repository';
import { UpsertBlockingScheduleDto } from '../../dto/upsert-blocking-schedule.dto';
import { BlockingSchedule, PauseFriction, BlockLevel } from '../../entities/blocking-schedule.entity';
import { FocusMode } from '../../entities/focus-mode.entity';
import { userDummy } from '../../../../../test/dummies';
import { SentryServiceMock } from '../../../../../test/mocks';

describe('BlockingScheduleService', () => {
  let blockingScheduleService: BlockingScheduleService;

  const BlockingScheduleRepositoryMock = {
    orm: {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    },
    findByUserId: jest.fn(),
  };

  const FocusModeRepositoryMock = {
    orm: {
      findOne: jest.fn(),
    },
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        BlockingScheduleService,
        BlockingScheduleRepository,
        FocusModeRepository,
        {
          provide: SENTRY_TOKEN,
          useValue: SentryServiceMock,
        },
      ],
    })
      .overrideProvider(BlockingScheduleRepository)
      .useValue(BlockingScheduleRepositoryMock)
      .overrideProvider(FocusModeRepository)
      .useValue(FocusModeRepositoryMock)
      .compile();

    blockingScheduleService = moduleRef.get<BlockingScheduleService>(BlockingScheduleService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(blockingScheduleService).toBeDefined();
  });

  describe('getBlockingSchedules', () => {
    it('should return user blocking schedules', async () => {
      const userId = userDummy.id;
      const mockSchedules = [
        new BlockingSchedule({
          id: randomUUID(),
          name: 'Work Hours',
          start_time: '09:00',
          end_time: '17:00',
          user_id: userId,
        }),
      ];

      BlockingScheduleRepositoryMock.findByUserId.mockResolvedValueOnce(mockSchedules);

      const result = await blockingScheduleService.getBlockingSchedules(userId);

      expect(BlockingScheduleRepositoryMock.findByUserId).toHaveBeenCalledWith(userId);
      expect(result).toEqual(mockSchedules);
    });
  });

  describe('createBlockingSchedule and updateBlockingSchedule', () => {
    const userId = userDummy.id;
    const focusModeId = randomUUID();
    const focusMode = new FocusMode({
      id: focusModeId,
      name: 'Work Focus',
      user_id: userId,
    });

    const createDto: UpsertBlockingScheduleDto = {
      name: 'Work Hours',
      start_time: '09:00',
      end_time: '17:00',
      focus_mode_id: focusModeId,
      days_of_week: [1, 2, 3, 4, 5],
      pause_friction: PauseFriction.TIMER,
      block_level: BlockLevel.STRICT,
      is_ai_blocking_enabled: true,
    };

    beforeEach(() => {
      FocusModeRepositoryMock.orm.findOne.mockResolvedValueOnce(focusMode);
    });

    it('should create new blocking schedule', async () => {
      const expectedSchedule = new BlockingSchedule({
        ...createDto,
        user_id: userId,
      });

      BlockingScheduleRepositoryMock.orm.save.mockResolvedValueOnce(expectedSchedule);

      const result = await blockingScheduleService.createBlockingSchedule(userId, createDto);

      expect(FocusModeRepositoryMock.orm.findOne).toHaveBeenCalledWith({
        where: { id: focusModeId, user_id: userId },
      });
      expect(BlockingScheduleRepositoryMock.orm.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: createDto.name,
          start_time: createDto.start_time,
          end_time: createDto.end_time,
          user_id: userId,
          focus_mode_id: focusModeId,
        }),
      );
      expect(result).toEqual(expectedSchedule);
    });

    it('should update existing blocking schedule', async () => {
      const scheduleId = randomUUID();
      const updateDto = { ...createDto, id: scheduleId };
      const existingSchedule = new BlockingSchedule({
        id: scheduleId,
        name: 'Old Name',
        user_id: userId,
      });

      BlockingScheduleRepositoryMock.orm.findOne.mockResolvedValueOnce(existingSchedule);
      BlockingScheduleRepositoryMock.orm.save.mockResolvedValueOnce({
        ...existingSchedule,
        ...updateDto,
      });

      await blockingScheduleService.updateBlockingSchedule(userId, scheduleId, updateDto);

      expect(BlockingScheduleRepositoryMock.orm.findOne).toHaveBeenCalledWith({
        where: { id: scheduleId, user_id: userId },
      });
      expect(BlockingScheduleRepositoryMock.orm.save).toHaveBeenCalled();
    });

    it('should throw NotFound when updating non-existing schedule', async () => {
      const scheduleId = randomUUID();
      const updateDto = { ...createDto, id: scheduleId };

      BlockingScheduleRepositoryMock.orm.findOne.mockResolvedValueOnce(null);

      await expect(
        blockingScheduleService.updateBlockingSchedule(userId, scheduleId, updateDto),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should ignore client-supplied id in DTO and use URL parameter id for security', async () => {
      const urlScheduleId = randomUUID();
      const maliciousDto = {
        ...createDto,
        id: 'malicious-id-attempt', // This should be ignored
      };
      const existingSchedule = new BlockingSchedule({
        id: urlScheduleId, // This is the correct ID from URL
        name: 'Old Name',
        user_id: userId,
      });

      BlockingScheduleRepositoryMock.orm.findOne.mockResolvedValueOnce(existingSchedule);
      BlockingScheduleRepositoryMock.orm.save.mockResolvedValueOnce({
        ...existingSchedule,
        ...maliciousDto,
        id: urlScheduleId, // Should use URL ID, not DTO ID
      });

      await blockingScheduleService.updateBlockingSchedule(userId, urlScheduleId, maliciousDto);

      // Verify that the findOne was called with the URL parameter id, not the DTO id
      expect(BlockingScheduleRepositoryMock.orm.findOne).toHaveBeenCalledWith({
        where: { id: urlScheduleId, user_id: userId },
      });

      // Verify that the save was called with the URL parameter id, not the malicious DTO id
      expect(BlockingScheduleRepositoryMock.orm.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: urlScheduleId, // Should be the URL parameter id, not the malicious one
        }),
      );
    });

    it('should set default values when not provided', async () => {
      const minimalDto = {
        name: 'Minimal Schedule',
        start_time: '09:00',
        end_time: '17:00',
        focus_mode_id: focusModeId,
      };

      BlockingScheduleRepositoryMock.orm.save.mockResolvedValueOnce(new BlockingSchedule(minimalDto));

      await blockingScheduleService.createBlockingSchedule(userId, minimalDto);

      expect(BlockingScheduleRepositoryMock.orm.save).toHaveBeenCalledWith(
        expect.objectContaining({
          days_of_week: [0, 1, 2, 3, 4, 5, 6], // Default to all days
          pause_friction: PauseFriction.NONE,
          block_level: BlockLevel.STRICT,
          is_ai_blocking_enabled: false,
          metadata: null, // Default to null
        }),
      );
    });

    it('should handle metadata field in create and update operations', async () => {
      const dtoWithMetadata = {
        name: 'Schedule with Metadata',
        start_time: '09:00',
        end_time: '17:00',
        focus_mode_id: focusModeId,
        metadata: { customField: 'test', priority: 'high' },
      };

      const expectedSchedule = new BlockingSchedule({
        ...dtoWithMetadata,
        user_id: userId,
      });

      BlockingScheduleRepositoryMock.orm.save.mockResolvedValueOnce(expectedSchedule);

      const result = await blockingScheduleService.createBlockingSchedule(userId, dtoWithMetadata);

      expect(BlockingScheduleRepositoryMock.orm.save).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: { customField: 'test', priority: 'high' },
        }),
      );
      expect(result).toEqual(expectedSchedule);
    });

    it('should handle SUPER_STRICT block level', async () => {
      const dtoWithSuperStrict = {
        name: 'Super Strict Schedule',
        start_time: '09:00',
        end_time: '17:00',
        focus_mode_id: focusModeId,
        block_level: BlockLevel.SUPER_STRICT,
      };

      const expectedSchedule = new BlockingSchedule({
        ...dtoWithSuperStrict,
        user_id: userId,
      });

      BlockingScheduleRepositoryMock.orm.save.mockResolvedValueOnce(expectedSchedule);

      const result = await blockingScheduleService.createBlockingSchedule(userId, dtoWithSuperStrict);

      expect(BlockingScheduleRepositoryMock.orm.save).toHaveBeenCalledWith(
        expect.objectContaining({
          block_level: BlockLevel.SUPER_STRICT,
        }),
      );
      expect(result).toEqual(expectedSchedule);
    });

    it('should handle PostgreSQL time format (HH:MM:SS) and normalize to HH:MM', async () => {
      const dtoWithSeconds = {
        name: 'Schedule with seconds',
        start_time: '09:30:45',
        end_time: '17:15:30',
        focus_mode_id: focusModeId,
      };

      const expectedSchedule = new BlockingSchedule({
        ...dtoWithSeconds,
        start_time: '09:30', // Normalized to HH:MM
        end_time: '17:15', // Normalized to HH:MM
        user_id: userId,
      });

      BlockingScheduleRepositoryMock.orm.save.mockResolvedValueOnce(expectedSchedule);

      const result = await blockingScheduleService.createBlockingSchedule(userId, dtoWithSeconds);

      expect(BlockingScheduleRepositoryMock.orm.save).toHaveBeenCalledWith(
        expect.objectContaining({
          start_time: '09:30', // Should be normalized
          end_time: '17:15', // Should be normalized
        }),
      );
      expect(result).toEqual(expectedSchedule);
    });

    it('should handle both HH:MM and HH:MM:SS formats in update', async () => {
      const scheduleId = randomUUID();
      const updateDto = {
        ...createDto,
        id: scheduleId,
        start_time: '08:45:30', // HH:MM:SS format
        end_time: '18:30', // HH:MM format
      };
      const existingSchedule = new BlockingSchedule({
        id: scheduleId,
        name: 'Old Name',
        user_id: userId,
      });

      BlockingScheduleRepositoryMock.orm.findOne.mockResolvedValueOnce(existingSchedule);
      BlockingScheduleRepositoryMock.orm.save.mockResolvedValueOnce({
        ...existingSchedule,
        ...updateDto,
        start_time: '08:45', // Should be normalized
        end_time: '18:30', // Should remain the same
      });

      await blockingScheduleService.updateBlockingSchedule(userId, scheduleId, updateDto);

      expect(BlockingScheduleRepositoryMock.orm.save).toHaveBeenCalledWith(
        expect.objectContaining({
          start_time: '08:45', // Normalized from HH:MM:SS
          end_time: '18:30',
        }),
      );
    });

    it('should ignore client-supplied id to prevent IDOR vulnerability', async () => {
      const maliciousDto = {
        ...createDto,
        id: 'malicious-id-attempt', // This should be ignored
      };

      const expectedSchedule = new BlockingSchedule({
        ...createDto,
        user_id: userId,
        // id should not be the malicious one
      });

      BlockingScheduleRepositoryMock.orm.save.mockResolvedValueOnce(expectedSchedule);

      const result = await blockingScheduleService.createBlockingSchedule(userId, maliciousDto);

      // Verify that the save was called with a schedule that doesn't have the malicious id
      expect(BlockingScheduleRepositoryMock.orm.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: createDto.name,
          start_time: createDto.start_time,
          end_time: createDto.end_time,
          user_id: userId,
          focus_mode_id: focusModeId,
        }),
      );

      // The result should not contain the malicious id
      expect(result).not.toHaveProperty('id', 'malicious-id-attempt');
    });
  });

  describe('deleteBlockingSchedule', () => {
    it('should delete existing blocking schedule', async () => {
      const userId = userDummy.id;
      const scheduleId = randomUUID();
      const existingSchedule = new BlockingSchedule({
        id: scheduleId,
        user_id: userId,
      });

      BlockingScheduleRepositoryMock.orm.findOne.mockResolvedValueOnce(existingSchedule);
      BlockingScheduleRepositoryMock.orm.remove.mockResolvedValueOnce(undefined);

      await blockingScheduleService.deleteBlockingSchedule(userId, scheduleId);

      expect(BlockingScheduleRepositoryMock.orm.findOne).toHaveBeenCalledWith({
        where: { id: scheduleId, user_id: userId },
      });
      expect(BlockingScheduleRepositoryMock.orm.remove).toHaveBeenCalledWith(existingSchedule);
    });

    it('should throw NotFoundException when schedule not found', async () => {
      const userId = userDummy.id;
      const scheduleId = randomUUID();

      BlockingScheduleRepositoryMock.orm.findOne.mockResolvedValueOnce(null);

      await expect(blockingScheduleService.deleteBlockingSchedule(userId, scheduleId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
