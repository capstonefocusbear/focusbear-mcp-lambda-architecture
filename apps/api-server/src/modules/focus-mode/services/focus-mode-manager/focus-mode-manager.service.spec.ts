import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import { randomUUID } from 'crypto';
import { DateTime, Settings } from 'luxon';
import { PusherService } from '@app/pusher';
import { PusherBeamsService } from '@app/pusher-beams';
import { In } from 'typeorm';
import { I18nService } from 'nestjs-i18n';
import { mockDeep } from 'jest-mock-extended';
import {
  CompletedFocusBlockDummy,
  FocusModeDummy,
  pusherBeamsPublishRequestDummy,
  userDummy,
} from '../../../../../test/dummies';
import {
  CompletedFocusBlockRepositoryMock,
  FocusModeRepositoryMock,
  PusherServiceMock,
  UserRepositoryMock,
  PusherBeamsServiceMock,
  SentryServiceMock,
  UserDailyStatsServiceMock,
  FocusModeServiceMock,
  ToDoRepositoryMock,
  ToDoServiceMock,
} from '../../../../../test/mocks';
import { User } from '../../../user/entities/user.entity';
import { UserRepository } from '../../../user/repositories/user.repository';
import { CurrentFocusModeData } from '../../domain/current-focus-mode-data.model';
import { FinishFocusModeDto } from '../../dto/finish-focus-mode.dto';
import { StartFocusModeDto } from '../../dto/start-focus-mode.dto';
import { CompletedFocusBlock } from '../../entities/completed-focus-block.entity';
import { CompletedFocusBlockRepository } from '../../repositories/completed-focus-block.repository';
import { FocusModeRepository } from '../../repositories/focus-mode.repository';
import { FocusModeManagerService } from './focus-mode-manager.service';
import { UserDailyStatsService } from '../../../user/services/user-daily-stats/user-daily-stats.service';
import { FocusModeService } from '../focus-mode/focus-mode.service';
import { ToDoRepository } from '../../../to-do/repositories/to-do.repository';
import { ToDo } from '../../../to-do/entities/to-do.entity';
import { ToDoTimeLogDto } from '../../../to-do/dto/to-do-time-log.dto.ts';
import { ToDoStatus } from '../../../to-do/domain/to-do-status.enum';
import { ToDoService } from '../../../to-do/services/to-do.service';

describe('FocusModeManagerService', () => {
  let focusModeManagerService: FocusModeManagerService;
  const i18nServiceMock = mockDeep<I18nService>();

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        FocusModeManagerService,
        FocusModeRepository,
        CompletedFocusBlockRepository,
        UserRepository,
        PusherService,
        PusherBeamsService,
        UserDailyStatsService,
        FocusModeService,
        ToDoRepository,
        ToDoService,
        {
          provide: SENTRY_TOKEN,
          useValue: SentryServiceMock,
        },
        {
          provide: I18nService,
          useValue: i18nServiceMock,
        },
      ],
    })
      .overrideProvider(FocusModeRepository)
      .useValue(FocusModeRepositoryMock)
      .overrideProvider(CompletedFocusBlockRepository)
      .useValue(CompletedFocusBlockRepositoryMock)
      .overrideProvider(UserRepository)
      .useValue(UserRepositoryMock)
      .overrideProvider(PusherService)
      .useValue(PusherServiceMock)
      .overrideProvider(PusherBeamsService)
      .useValue(PusherBeamsServiceMock)
      .overrideProvider(UserDailyStatsService)
      .useValue(UserDailyStatsServiceMock)
      .overrideProvider(FocusModeService)
      .useValue(FocusModeServiceMock)
      .overrideProvider(ToDoRepository)
      .useValue(ToDoRepositoryMock)
      .overrideProvider(ToDoService)
      .useValue(ToDoServiceMock)
      .compile();

    focusModeManagerService = moduleRef.get<FocusModeManagerService>(FocusModeManagerService);
  });

  it('should be defined', () => {
    expect(focusModeManagerService).toBeDefined();
  });

  describe('startCurrentFocusMode', () => {
    const focus_mode_id = FocusModeDummy.id;
    const user_id = userDummy.id;
    const startFocusModeDto: StartFocusModeDto = {
      finish_time: CompletedFocusBlockDummy.finish_time,
      start_time: CompletedFocusBlockDummy.start_time,
      intention: CompletedFocusBlockDummy.intention,
    };
    const dummyHeaders = { 'device-id': '12345' };

    it('negative: should throw NotFoundException if focus mode does not exist', async () => {
      FocusModeRepositoryMock.findOneByIdForUser.mockResolvedValueOnce(null);
      const errorMessage = `Focus Mode with id: ${focus_mode_id} does not exist for User with id: ${user_id}!`;
      let exception: any;

      try {
        await focusModeManagerService.startCurrentFocusMode(
          startFocusModeDto,
          { focus_mode_id },
          user_id,
          dummyHeaders,
        );
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: new completed focus block item should be created', async () => {
      FocusModeRepositoryMock.findOneByIdForUser.mockResolvedValueOnce(FocusModeDummy);
      UserRepositoryMock.orm.findOneBy.mockResolvedValue(userDummy);
      CompletedFocusBlockRepositoryMock.orm.save.mockResolvedValueOnce(CompletedFocusBlockDummy);

      await focusModeManagerService.startCurrentFocusMode(startFocusModeDto, { focus_mode_id }, user_id, dummyHeaders);

      expect(CompletedFocusBlockRepositoryMock.orm.save).toBeCalledWith(
        new CompletedFocusBlock({
          start_time: startFocusModeDto.start_time,
          scheduled_finish_time: startFocusModeDto.finish_time,
          intention: startFocusModeDto.intention,
          user_id,
          focus_mode_id,
          to_dos: [],
        }),
      );
    });

    it('positive: started focus mode should be made current in the User entity', async () => {
      FocusModeRepositoryMock.findOneByIdForUser.mockResolvedValueOnce(FocusModeDummy);
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      CompletedFocusBlockRepositoryMock.orm.save.mockResolvedValueOnce(CompletedFocusBlockDummy);

      await focusModeManagerService.startCurrentFocusMode(startFocusModeDto, { focus_mode_id }, user_id, dummyHeaders);

      expect(UserRepositoryMock.orm.update).toBeCalledWith(
        user_id,
        new CurrentFocusModeData({
          finish_time: startFocusModeDto.finish_time,
          focus_mode_id,
          completed_mode_id: CompletedFocusBlockDummy.id,
        }),
      );
    });

    it('positive: push notification should be sent via "focus_mode" channel', async () => {
      FocusModeRepositoryMock.findOneByIdForUser.mockResolvedValueOnce(FocusModeDummy);
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      CompletedFocusBlockRepositoryMock.orm.save.mockResolvedValueOnce(CompletedFocusBlockDummy);
      PusherBeamsServiceMock.createBeamsPublishRequest.mockImplementationOnce(() => pusherBeamsPublishRequestDummy);

      await focusModeManagerService.startCurrentFocusMode(startFocusModeDto, { focus_mode_id }, user_id, dummyHeaders);

      expect(PusherServiceMock.trigger).toBeCalledWith(`private-${user_id}`, 'focus-mode-started', {
        ...CompletedFocusBlockDummy,
        device_id: dummyHeaders['device-id'],
      });
      expect(PusherBeamsServiceMock.publishToUsers).toHaveBeenCalledWith([user_id], pusherBeamsPublishRequestDummy);
    });

    it('positive: should finish the current focus mode if exists - before staring new focus mode', async () => {
      const userWithCurrentFocusMode = new User({
        ...userDummy,
        current_focus_mode_id: randomUUID(),
      });
      FocusModeRepositoryMock.findOneByIdForUser.mockResolvedValue(FocusModeDummy);
      UserRepositoryMock.orm.findOneBy.mockResolvedValue(userWithCurrentFocusMode);
      CompletedFocusBlockRepositoryMock.orm.save.mockResolvedValueOnce(CompletedFocusBlockDummy);
      PusherBeamsServiceMock.createBeamsPublishRequest.mockImplementationOnce(() => pusherBeamsPublishRequestDummy);

      await focusModeManagerService.startCurrentFocusMode(
        startFocusModeDto,
        { focus_mode_id },
        userWithCurrentFocusMode.id,
        dummyHeaders,
      );

      expect(UserRepositoryMock.orm.update).toBeCalledWith(
        userWithCurrentFocusMode.id,
        new CurrentFocusModeData({
          finish_time: null,
          focus_mode_id: null,
          completed_mode_id: null,
        }),
      );
    });

    it('positive: should create record for incoming focus mode after marking current as finished', async () => {
      const userWithCurrentFocusMode = new User({
        ...userDummy,
        current_focus_mode_id: randomUUID(),
      });
      FocusModeRepositoryMock.findOneByIdForUser.mockResolvedValue(FocusModeDummy);
      UserRepositoryMock.orm.findOneBy.mockResolvedValue(userWithCurrentFocusMode);
      CompletedFocusBlockRepositoryMock.orm.save.mockResolvedValueOnce(CompletedFocusBlockDummy);
      PusherBeamsServiceMock.createBeamsPublishRequest.mockImplementationOnce(() => pusherBeamsPublishRequestDummy);

      await focusModeManagerService.startCurrentFocusMode(
        startFocusModeDto,
        { focus_mode_id },
        userWithCurrentFocusMode.id,
        dummyHeaders,
      );

      expect(CompletedFocusBlockRepositoryMock.orm.save).toBeCalledWith(
        new CompletedFocusBlock({
          start_time: startFocusModeDto.start_time,
          scheduled_finish_time: startFocusModeDto.finish_time,
          intention: startFocusModeDto.intention,
          user_id,
          focus_mode_id,
          to_dos: [],
        }),
      );
    });

    it('positive: if to dos are sent with starting focus mode they should be linked to completed focus block record', async () => {
      const userWithCurrentFocusMode = new User({
        ...userDummy,
        current_focus_mode_id: randomUUID(),
      });
      const toDoDummy = { id: randomUUID(), title: 'test', details: 'test', eisenhower_quadrant: 1 };
      const toDoDBResponseDummy = new ToDo({ user_id: userDummy.id, ...toDoDummy });
      FocusModeRepositoryMock.findOneByIdForUser.mockResolvedValue(FocusModeDummy);
      UserRepositoryMock.orm.findOneBy.mockResolvedValue(userWithCurrentFocusMode);
      CompletedFocusBlockRepositoryMock.orm.save.mockResolvedValueOnce(CompletedFocusBlockDummy);
      PusherBeamsServiceMock.createBeamsPublishRequest.mockImplementationOnce(() => pusherBeamsPublishRequestDummy);
      ToDoRepositoryMock.orm.find.mockResolvedValueOnce([toDoDBResponseDummy]);

      await focusModeManagerService.startCurrentFocusMode(
        { ...startFocusModeDto, to_dos: [toDoDummy] },
        { focus_mode_id },
        userWithCurrentFocusMode.id,
        dummyHeaders,
      );

      expect(ToDoRepositoryMock.orm.find).toBeCalledWith({ where: { user_id: userDummy.id, id: In([toDoDummy.id]) } });
      expect(CompletedFocusBlockRepositoryMock.orm.save).toBeCalledWith(
        new CompletedFocusBlock({
          start_time: startFocusModeDto.start_time,
          scheduled_finish_time: startFocusModeDto.finish_time,
          intention: startFocusModeDto.intention,
          user_id,
          focus_mode_id,
          to_dos: [toDoDBResponseDummy],
        }),
      );
    });
  });

  describe('finishCurrentFocusMode', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      jest.resetAllMocks();
    });
    const thirtyMinutesInSeconds = 1800;
    const focus_mode_id = FocusModeDummy.id;
    const user_id = userDummy.id;
    const finishFocusModeDto: FinishFocusModeDto = {
      achievements: CompletedFocusBlockDummy.achievements,
      finish_time: CompletedFocusBlockDummy.finish_time,
      focus_duration_seconds: thirtyMinutesInSeconds,
    };

    it('negative: should throw NotFoundException if focus mode does not exist', async () => {
      FocusModeRepositoryMock.findOneByIdForUser.mockResolvedValueOnce(null);
      const errorMessage = `Focus Mode with id: ${focus_mode_id} does not exist for User with id: ${user_id}!`;
      let exception: any;

      try {
        await focusModeManagerService.finishCurrentFocusMode(finishFocusModeDto, { focus_mode_id }, user_id);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('negative: should throw BadRequestException if the finishing focus mode is not current', async () => {
      const current_focus_mode_id = randomUUID();
      const userWithAnotherCurrentFocusMode: User = { ...userDummy, current_focus_mode_id };
      FocusModeRepositoryMock.findOneByIdForUser.mockResolvedValueOnce(FocusModeDummy);
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userWithAnotherCurrentFocusMode);
      const errorMessage = `Focus mode with id: ${focus_mode_id} is not current, the current one is ${current_focus_mode_id}!`;
      let exception: any;

      try {
        await focusModeManagerService.finishCurrentFocusMode(finishFocusModeDto, { focus_mode_id }, user_id);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(BadRequestException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: the current focus mode should be nullified in the User entity', async () => {
      const current_focus_mode_id = FocusModeDummy.id;
      const current_completing_focus_block_id = CompletedFocusBlockDummy.id;
      const userWithCurrentFocusMode: User = { ...userDummy, current_focus_mode_id, current_completing_focus_block_id };
      FocusModeRepositoryMock.findOneByIdForUser.mockResolvedValueOnce(FocusModeDummy);
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userWithCurrentFocusMode);
      CompletedFocusBlockRepositoryMock.orm.findOneBy.mockResolvedValueOnce(CompletedFocusBlockDummy);

      await focusModeManagerService.finishCurrentFocusMode(finishFocusModeDto, { focus_mode_id }, user_id);

      expect(UserRepositoryMock.orm.update).toBeCalledWith(
        user_id,
        new CurrentFocusModeData({
          finish_time: null,
          focus_mode_id: null,
          completed_mode_id: null,
        }),
      );
    });

    it('positive: completed focus block item should be updated with finishFocusModeDto data', async () => {
      const current_focus_mode_id = FocusModeDummy.id;
      const current_completing_focus_block_id = CompletedFocusBlockDummy.id;
      const userWithCurrentFocusMode: User = { ...userDummy, current_focus_mode_id, current_completing_focus_block_id };
      FocusModeRepositoryMock.findOneByIdForUser.mockResolvedValueOnce(FocusModeDummy);
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userWithCurrentFocusMode);
      CompletedFocusBlockRepositoryMock.orm.findOneBy.mockResolvedValueOnce(CompletedFocusBlockDummy);

      await focusModeManagerService.finishCurrentFocusMode(finishFocusModeDto, { focus_mode_id }, user_id);

      expect(CompletedFocusBlockRepositoryMock.orm.save).toBeCalledWith({
        ...CompletedFocusBlockDummy,
        ...finishFocusModeDto,
        tags: [],
      });
    });

    it('positive: push notification should be sent via "focus_mode" channel', async () => {
      const current_focus_mode_id = FocusModeDummy.id;
      const current_completing_focus_block_id = CompletedFocusBlockDummy.id;
      const userWithCurrentFocusMode: User = { ...userDummy, current_focus_mode_id, current_completing_focus_block_id };
      FocusModeRepositoryMock.findOneByIdForUser.mockResolvedValueOnce(FocusModeDummy);
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userWithCurrentFocusMode);
      CompletedFocusBlockRepositoryMock.orm.save.mockResolvedValueOnce(CompletedFocusBlockDummy);
      PusherBeamsServiceMock.createBeamsPublishRequest.mockImplementationOnce(() => pusherBeamsPublishRequestDummy);
      CompletedFocusBlockRepositoryMock.orm.findOneBy.mockResolvedValueOnce(CompletedFocusBlockDummy);

      await focusModeManagerService.finishCurrentFocusMode(finishFocusModeDto, { focus_mode_id }, user_id);

      expect(PusherServiceMock.trigger).toBeCalledWith(`private-${user_id}`, 'focus-mode-finished', {
        ...CompletedFocusBlockDummy,
        device_id: null,
      });
      expect(PusherBeamsServiceMock.publishToUsers).toHaveBeenCalledWith([user_id], pusherBeamsPublishRequestDummy);
    });

    it('positive: user last_completed_focus_mode_at field should be updated', async () => {
      Settings.now = () => new Date('2023-02-07T05:42:39.221Z').valueOf();
      const current_focus_mode_id = FocusModeDummy.id;
      const current_completing_focus_block_id = CompletedFocusBlockDummy.id;
      const userWithCurrentFocusMode: User = { ...userDummy, current_focus_mode_id, current_completing_focus_block_id };
      FocusModeRepositoryMock.findOneByIdForUser.mockResolvedValueOnce(FocusModeDummy);
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userWithCurrentFocusMode);
      CompletedFocusBlockRepositoryMock.orm.findOneBy.mockResolvedValueOnce(CompletedFocusBlockDummy);

      await focusModeManagerService.finishCurrentFocusMode(finishFocusModeDto, { focus_mode_id }, user_id);

      expect(UserRepositoryMock.update).toBeCalledWith(user_id, {
        last_completed_focus_mode_at: DateTime.fromISO('2023-02-07T05:42:39.221Z').toJSDate(),
        has_received_inactivity_warning: false,
        updated_at: expect.toBeDateString(),
      });
    });

    it('positive: if no focus_duration_seconds argument is passed the focus duration should be calculated using the start and finish time', async () => {
      const current_focus_mode_id = FocusModeDummy.id;
      const current_completing_focus_block_id = CompletedFocusBlockDummy.id;
      const finishedFocusModeData: FinishFocusModeDto = {
        achievements: CompletedFocusBlockDummy.achievements,
        finish_time: new Date('2023-02-07T05:10:00.000Z'),
      };
      const completedFocusBlock = { ...CompletedFocusBlockDummy, start_time: new Date('2023-02-07T05:00:00.000Z') };
      const userWithCurrentFocusMode: User = { ...userDummy, current_focus_mode_id, current_completing_focus_block_id };
      FocusModeRepositoryMock.findOneByIdForUser.mockResolvedValueOnce(FocusModeDummy);
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userWithCurrentFocusMode);
      CompletedFocusBlockRepositoryMock.orm.findOneBy.mockResolvedValueOnce(completedFocusBlock);

      await focusModeManagerService.finishCurrentFocusMode(finishedFocusModeData, { focus_mode_id }, user_id);

      expect(CompletedFocusBlockRepositoryMock.orm.save).toBeCalledWith({
        ...completedFocusBlock,
        ...finishedFocusModeData,
        focus_duration_seconds: 600,
        tags: [],
      });
    });

    it('positive: if to dos are sent with finishing focus mode, their statuses should be updated', async () => {
      const current_focus_mode_id = FocusModeDummy.id;
      const current_completing_focus_block_id = CompletedFocusBlockDummy.id;
      const toDoTimeLogDummies: ToDoTimeLogDto[] = [{ id: randomUUID(), duration: 300, status: ToDoStatus.COMPLETED }];
      const userWithCurrentFocusMode: User = { ...userDummy, current_focus_mode_id, current_completing_focus_block_id };
      FocusModeRepositoryMock.findOneByIdForUser.mockResolvedValueOnce(FocusModeDummy);
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userWithCurrentFocusMode);
      CompletedFocusBlockRepositoryMock.orm.findOneBy.mockResolvedValueOnce(CompletedFocusBlockDummy);

      await focusModeManagerService.finishCurrentFocusMode(
        { ...finishFocusModeDto, to_dos: toDoTimeLogDummies },
        { focus_mode_id },
        user_id,
      );

      expect(ToDoServiceMock.logToDosTime).toBeCalledWith(
        toDoTimeLogDummies,
        userDummy.id,
        CompletedFocusBlockDummy.id,
      );
    });

    it('positive: after completing focus block, user daily stat focus block count should be incremented and duration spent in focus sessions should be updated', async () => {
      const current_focus_mode_id = FocusModeDummy.id;
      const current_completing_focus_block_id = CompletedFocusBlockDummy.id;
      const finishTime = new Date('2023-02-07T05:10:00.000Z');
      const finishedFocusModeData: FinishFocusModeDto = {
        achievements: CompletedFocusBlockDummy.achievements,
        finish_time: finishTime,
      };
      const completedFocusBlock = { ...CompletedFocusBlockDummy, start_time: new Date('2023-02-07T05:00:00.000Z') };
      const userWithCurrentFocusMode: User = { ...userDummy, current_focus_mode_id, current_completing_focus_block_id };
      FocusModeRepositoryMock.findOneByIdForUser.mockResolvedValueOnce(FocusModeDummy);
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userWithCurrentFocusMode);
      CompletedFocusBlockRepositoryMock.orm.findOneBy.mockResolvedValueOnce(completedFocusBlock);

      await focusModeManagerService.finishCurrentFocusMode(finishedFocusModeData, { focus_mode_id }, user_id);

      expect(UserDailyStatsServiceMock.updateDailyStatsFocusModesCompleted).toBeCalledWith(
        user_id,
        finishTime,
        userDummy.timezone,
        // start and end time are 10 minutes apart (600 seconds)
        600,
      );
    });
  });
});
