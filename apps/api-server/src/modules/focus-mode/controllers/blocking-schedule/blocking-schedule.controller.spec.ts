import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { BlockingScheduleController } from './blocking-schedule.controller';
import { BlockingScheduleService } from '../../services/blocking-schedule/blocking-schedule.service';
import { BlockingSchedule, BlockLevel, PauseFriction } from '../../entities/blocking-schedule.entity';
import { FocusMode } from '../../entities/focus-mode.entity';
import { Passport } from '../../../auth/domain/passport.model';
import { userDummy } from '../../../../../test/dummies';
import { UpsertBlockingScheduleDto } from '../../dto/upsert-blocking-schedule.dto';

describe('BlockingScheduleController', () => {
  let controller: BlockingScheduleController;
  let blockingScheduleService: BlockingScheduleService;

  const passport = new Passport({
    user: userDummy as any,
    isAuth: true,
    declineReason: null,
  });

  const blockingScheduleServiceMock = {
    getBlockingSchedules: jest.fn(),
    createBlockingSchedule: jest.fn(),
    updateBlockingSchedule: jest.fn(),
    deleteBlockingSchedule: jest.fn(),
  };

  const focusMode = new FocusMode({
    id: randomUUID(),
    name: 'Deep Work',
    metadata: { blockedAppsArray: ['com.example.app'] },
    user_id: userDummy.id,
  });

  const blockingSchedule = new BlockingSchedule({
    id: randomUUID(),
    name: 'Morning Work',
    start_time: '09:00',
    end_time: '12:00',
    days_of_week: [1, 2, 3, 4, 5],
    focus_mode_id: focusMode.id,
    user_id: userDummy.id,
    pause_friction: PauseFriction.TIMER,
    block_level: BlockLevel.STRICT,
    is_ai_blocking_enabled: true,
    metadata: { is_micro_breaks_enabled: true },
    focus_mode: focusMode,
  });

  const upsertDto: UpsertBlockingScheduleDto = {
    name: 'Morning Work',
    start_time: '09:00',
    end_time: '12:00',
    days_of_week: [1, 2, 3, 4, 5],
    focus_mode_id: focusMode.id,
    pause_friction: PauseFriction.TIMER,
    block_level: BlockLevel.STRICT,
    is_ai_blocking_enabled: true,
    metadata: { is_micro_breaks_enabled: true },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BlockingScheduleController],
      providers: [
        {
          provide: BlockingScheduleService,
          useValue: blockingScheduleServiceMock,
        },
      ],
    }).compile();

    controller = module.get<BlockingScheduleController>(BlockingScheduleController);
    blockingScheduleService = module.get<BlockingScheduleService>(BlockingScheduleService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('returns blocking schedules unchanged, including metadata and focus_mode', async () => {
    blockingScheduleServiceMock.getBlockingSchedules.mockResolvedValueOnce([blockingSchedule]);

    const result = await controller.getBlockingSchedules(passport);

    expect(blockingScheduleService.getBlockingSchedules).toHaveBeenCalledWith(userDummy.id);
    expect(result).toEqual([blockingSchedule]);
    expect(result[0].metadata).toEqual({ is_micro_breaks_enabled: true });
    expect(result[0].focus_mode).toEqual(focusMode);
    expect(result[0].user_id).toBe(userDummy.id);
  });

  it('returns the created blocking schedule unchanged', async () => {
    blockingScheduleServiceMock.createBlockingSchedule.mockResolvedValueOnce(blockingSchedule);

    const result = await controller.createBlockingSchedule(upsertDto, passport);

    expect(blockingScheduleService.createBlockingSchedule).toHaveBeenCalledWith(userDummy.id, upsertDto);
    expect(result).toBe(blockingSchedule);
    expect(result.metadata).toEqual({ is_micro_breaks_enabled: true });
    expect(result.focus_mode).toEqual(focusMode);
  });

  it('returns the updated blocking schedule unchanged', async () => {
    blockingScheduleServiceMock.updateBlockingSchedule.mockResolvedValueOnce(blockingSchedule);

    const result = await controller.updateBlockingSchedule(blockingSchedule.id, upsertDto, passport);

    expect(blockingScheduleService.updateBlockingSchedule).toHaveBeenCalledWith(
      userDummy.id,
      blockingSchedule.id,
      upsertDto,
    );
    expect(result).toBe(blockingSchedule);
    expect(result.metadata).toEqual({ is_micro_breaks_enabled: true });
    expect(result.focus_mode).toEqual(focusMode);
  });
});
