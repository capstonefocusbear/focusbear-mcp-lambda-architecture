import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PusherBeamsService } from '../../../../../../../libs/pusher-beams/src';
import { PusherService } from '../../../../../../../libs/pusher/src';
import { User } from '../../../user/entities/user.entity';
import { UserRepository } from '../../../user/repositories/user.repository';
import { CurrentFocusModeData } from '../../domain/current-focus-mode-data.model';
import { FinishFocusModeDto } from '../../dto/finish-focus-mode.dto';
import { GetFocusModeParamsDto } from '../../dto/get-focus-mode-params.dto';
import { StartFocusModeDto } from '../../dto/start-focus-mode.dto';
import { CompletedFocusBlock } from '../../entities/completed-focus-block.entity';
import { FocusMode } from '../../entities/focus-mode.entity';
import { CompletedFocusBlockRepository } from '../../repositories/completed-focus-block.repository';
import { FocusModeRepository } from '../../repositories/focus-mode.repository';

@Injectable()
export class FocusModeManagerService {
  constructor(
    private readonly focusModeRepository: FocusModeRepository,
    private readonly completedFocusBlockRepository: CompletedFocusBlockRepository,
    private readonly userRepository: UserRepository,
    private readonly pusher: PusherService,
    private readonly pusherBeamsService: PusherBeamsService,
  ) {}

  async startCurrentFocusMode(
    { finish_time, intention, start_time }: StartFocusModeDto,
    { focus_mode_id }: GetFocusModeParamsDto,
    user_id: string,
  ): Promise<void> {
    await this.validateStartingFocusMode(focus_mode_id, user_id);
    const scheduled_finish_time = finish_time;
    const completedFocusBlock = new CompletedFocusBlock({
      start_time,
      scheduled_finish_time,
      intention,
      user_id,
      focus_mode_id,
    });
    const completedMode = await this.completedFocusBlockRepository.create(completedFocusBlock);
    const completed_mode_id = completedMode.id;
    const userDataToUpdate = new CurrentFocusModeData({ finish_time, focus_mode_id, completed_mode_id });
    const publishRequest = this.pusherBeamsService.createBeamsPublishRequest(completedMode);
    await this.userRepository.orm.update(user_id, userDataToUpdate);
    await this.pusher.trigger(`private-${user_id}`, 'focus_mode-started', completedMode);
    await this.pusherBeamsService.publishToUsers([user_id], publishRequest);
  }

  private async validateStartingFocusMode(focus_mode_id: string, user_id: string): Promise<[FocusMode, User]> | never {
    const [focusMode, user] = await this.fetchFocusModeAndUser(focus_mode_id, user_id);
    const notFoundModeMsg = `Focus Mode with id: ${focus_mode_id} does not exist for User with id: ${user_id}!`;
    if (!focusMode) throw new NotFoundException(notFoundModeMsg);
    const hasUserCurrentMode = Boolean(user.current_focus_mode_id);
    const hasCurrentModeMsg = `User already has unfinished current focus mode with id: ${user.current_focus_mode_id}!`;
    if (hasUserCurrentMode) throw new BadRequestException(hasCurrentModeMsg);
    return [focusMode, user];
  }

  private async fetchFocusModeAndUser(focus_mode_id: string, user_id: string): Promise<[FocusMode, User]> {
    return Promise.all([
      this.focusModeRepository.findOneByIdForUser(focus_mode_id, user_id),
      this.userRepository.orm.findOne(user_id),
    ]);
  }

  async finishCurrentFocusMode(
    { distractions, achievements, finish_time }: FinishFocusModeDto,
    { focus_mode_id }: GetFocusModeParamsDto,
    user_id: string,
  ): Promise<void> {
    const [, user] = await this.validateFinishingFocusMode(focus_mode_id, user_id);
    const updateCriteria = user.current_completing_focus_block_id;
    const completedBlockDataToUpdate = { distractions, achievements, finish_time };
    const [, completedMode] = await Promise.all([
      this.nullifyCurrentFocusModeForUser(user_id),
      this.completedFocusBlockRepository.update(updateCriteria, completedBlockDataToUpdate),
    ]);
    const publishRequest = this.pusherBeamsService.createBeamsPublishRequest(completedMode);
    await this.pusher.trigger(`private-${user_id}`, 'focus_mode-finished', completedMode);
    await this.pusherBeamsService.publishToUsers([user_id], publishRequest);
  }

  private async validateFinishingFocusMode(focus_mode_id: string, user_id: string): Promise<[FocusMode, User]> | never {
    const [focusMode, user] = await this.fetchFocusModeAndUser(focus_mode_id, user_id);
    const notFoundModeMsg = `Focus Mode with id: ${focus_mode_id} does not exist for User with id: ${user_id}!`;
    if (!focusMode) throw new NotFoundException(notFoundModeMsg);
    const { current_focus_mode_id } = user;
    const isCurrentMode = focus_mode_id === current_focus_mode_id;
    const isNotCurrentMsg = `Focus mode with id: ${focus_mode_id} is not current, the current one is ${current_focus_mode_id}!`;
    if (!isCurrentMode) throw new BadRequestException(isNotCurrentMsg);
    return [focusMode, user];
  }

  private async nullifyCurrentFocusModeForUser(user_id: string): Promise<void> {
    const userDataToUpdate = new CurrentFocusModeData();
    await this.userRepository.orm.update(user_id, userDataToUpdate);
  }
}
