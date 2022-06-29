import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { CompletedFocusBlockDummy, FocusModeDummy, userDummy } from '../../../../../test/dummies ';
import {
  CompletedFocusBlockRepositoryMock,
  FocusModeRepositoryMock,
  PusherServiceMock,
  UserRepositoryMock,
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
import { PusherService } from '../../../../../../../libs/pusher/src';

describe('FocusModeManagerService', () => {
  let focusModeManagerService: FocusModeManagerService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        FocusModeManagerService,
        FocusModeRepository,
        CompletedFocusBlockRepository,
        UserRepository,
        PusherService,
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

    it('negative: should throw NotFoundException if focus mode does not exist', async () => {
      FocusModeRepositoryMock.findOneByIdForUser.mockResolvedValueOnce(null);
      const errorMessage = `Focus Mode with id: ${focus_mode_id} does not exist for User with id: ${user_id}!`;
      let exception: any;

      try {
        await focusModeManagerService.startCurrentFocusMode(startFocusModeDto, { focus_mode_id }, user_id);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('negative: should throw BadRequestException if User already has unfinished current focus mode', async () => {
      const current_focus_mode_id = randomUUID();
      const userWithUnfinishedFocusMode: User = { ...userDummy, current_focus_mode_id };
      FocusModeRepositoryMock.findOneByIdForUser.mockResolvedValueOnce(FocusModeDummy);
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userWithUnfinishedFocusMode);
      const errorMessage = `User already has unfinished current focus mode with id: ${current_focus_mode_id}!`;
      let exception: any;

      try {
        await focusModeManagerService.startCurrentFocusMode(startFocusModeDto, { focus_mode_id }, user_id);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(BadRequestException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: new completed focus block item should be created', async () => {
      FocusModeRepositoryMock.findOneByIdForUser.mockResolvedValueOnce(FocusModeDummy);
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userDummy);
      CompletedFocusBlockRepositoryMock.create.mockResolvedValueOnce(CompletedFocusBlockDummy);

      await focusModeManagerService.startCurrentFocusMode(startFocusModeDto, { focus_mode_id }, user_id);

      expect(CompletedFocusBlockRepositoryMock.create).toBeCalledWith(
        new CompletedFocusBlock({
          start_time: startFocusModeDto.start_time,
          scheduled_finish_time: startFocusModeDto.finish_time,
          intention: startFocusModeDto.intention,
          user_id,
          focus_mode_id,
        }),
      );
    });

    it('positive: started focus mode should be made current in the User entity', async () => {
      FocusModeRepositoryMock.findOneByIdForUser.mockResolvedValueOnce(FocusModeDummy);
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userDummy);
      CompletedFocusBlockRepositoryMock.create.mockResolvedValueOnce(CompletedFocusBlockDummy);

      await focusModeManagerService.startCurrentFocusMode(startFocusModeDto, { focus_mode_id }, user_id);

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
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userDummy);
      CompletedFocusBlockRepositoryMock.create.mockResolvedValueOnce(CompletedFocusBlockDummy);

      await focusModeManagerService.startCurrentFocusMode(startFocusModeDto, { focus_mode_id }, user_id);

      expect(PusherServiceMock.trigger).toBeCalledWith('focus_mode', 'started', CompletedFocusBlockDummy);
    });
  });

  describe('finishCurrentFocusMode', () => {
    const focus_mode_id = FocusModeDummy.id;
    const user_id = userDummy.id;
    const finishFocusModeDto: FinishFocusModeDto = {
      achievements: CompletedFocusBlockDummy.achievements,
      finish_time: CompletedFocusBlockDummy.finish_time,
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
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userWithAnotherCurrentFocusMode);
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
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userWithCurrentFocusMode);

      await focusModeManagerService.finishCurrentFocusMode(finishFocusModeDto, { focus_mode_id }, user_id);

      expect(UserRepositoryMock.orm.update).toBeCalledWith(user_id, new CurrentFocusModeData());
    });

    it('positive: completed focus block item should be updated with finishFocusModeDto data', async () => {
      const current_focus_mode_id = FocusModeDummy.id;
      const current_completing_focus_block_id = CompletedFocusBlockDummy.id;
      const userWithCurrentFocusMode: User = { ...userDummy, current_focus_mode_id, current_completing_focus_block_id };
      FocusModeRepositoryMock.findOneByIdForUser.mockResolvedValueOnce(FocusModeDummy);
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userWithCurrentFocusMode);

      await focusModeManagerService.finishCurrentFocusMode(finishFocusModeDto, { focus_mode_id }, user_id);

      expect(CompletedFocusBlockRepositoryMock.update).toBeCalledWith(
        userWithCurrentFocusMode.current_completing_focus_block_id,
        {
          ...finishFocusModeDto,
        },
      );
    });

    it('positive: push notification should be sent via "focus_mode" channel', async () => {
      const current_focus_mode_id = FocusModeDummy.id;
      const current_completing_focus_block_id = CompletedFocusBlockDummy.id;
      const userWithCurrentFocusMode: User = { ...userDummy, current_focus_mode_id, current_completing_focus_block_id };
      FocusModeRepositoryMock.findOneByIdForUser.mockResolvedValueOnce(FocusModeDummy);
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userWithCurrentFocusMode);
      CompletedFocusBlockRepositoryMock.update.mockResolvedValueOnce(CompletedFocusBlockDummy);

      await focusModeManagerService.finishCurrentFocusMode(finishFocusModeDto, { focus_mode_id }, user_id);

      expect(PusherServiceMock.trigger).toBeCalledWith('focus_mode', 'finished', CompletedFocusBlockDummy);
    });
  });
});
