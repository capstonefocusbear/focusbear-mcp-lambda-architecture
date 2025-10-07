import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { BlockingScheduleRepository } from '../../repositories/blocking-schedule.repository';
import { FocusModeRepository } from '../../repositories/focus-mode.repository';
import { UpsertBlockingScheduleDto } from '../../dto/upsert-blocking-schedule.dto';
import { BlockingSchedule, PauseFriction, BlockLevel } from '../../entities/blocking-schedule.entity';
import { BaseCRUDService } from '../../../../shared/services/base-crud.service';

@Injectable()
export class BlockingScheduleService extends BaseCRUDService<BlockingScheduleRepository, BlockingSchedule> {
  constructor(
    private readonly blockingScheduleRepository: BlockingScheduleRepository,
    private readonly focusModeRepository: FocusModeRepository,
    @InjectSentry() private readonly sentryService: SentryService,
  ) {
    super(blockingScheduleRepository);
  }

  async getBlockingSchedules(userId: string): Promise<BlockingSchedule[]> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Getting blocking schedules for user',
        data: { userId },
      });

      return await this.blockingScheduleRepository.findByUserId(userId);
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async createBlockingSchedule(
    userId: string,
    blockingScheduleDto: UpsertBlockingScheduleDto,
  ): Promise<BlockingSchedule> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Creating blocking schedule',
        data: { userId, blockingScheduleDto },
      });

      // Validate that the focus mode belongs to the user
      const focusMode = await this.focusModeRepository.orm.findOne({
        where: { id: blockingScheduleDto.focus_mode_id, user_id: userId },
      });

      if (!focusMode) {
        throw new BadRequestException('Focus mode not found or does not belong to user');
      }

      // Validate time format and logic
      this.validateTimeFormat(blockingScheduleDto.start_time);
      this.validateTimeFormat(blockingScheduleDto.end_time);

      // Set default values - exclude id to prevent IDOR vulnerability
      const { id, ...dtoWithoutId } = blockingScheduleDto;
      const blockingScheduleData = {
        ...dtoWithoutId,
        start_time: this.normalizeTimeFormat(blockingScheduleDto.start_time),
        end_time: this.normalizeTimeFormat(blockingScheduleDto.end_time),
        user_id: userId,
        days_of_week: blockingScheduleDto.days_of_week || [0, 1, 2, 3, 4, 5, 6], // Default to all days
        pause_friction: blockingScheduleDto.pause_friction || PauseFriction.NONE,
        block_level: blockingScheduleDto.block_level || BlockLevel.STRICT,
        is_ai_blocking_enabled: blockingScheduleDto.is_ai_blocking_enabled || false,
        metadata: blockingScheduleDto.metadata || null,
      };

      // Always create a new schedule
      const blockingSchedule = new BlockingSchedule(blockingScheduleData);
      return await this.blockingScheduleRepository.orm.save(blockingSchedule);
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async updateBlockingSchedule(
    userId: string,
    id: string,
    blockingScheduleDto: UpsertBlockingScheduleDto,
  ): Promise<BlockingSchedule> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Updating blocking schedule',
        data: { userId, id, blockingScheduleDto },
      });

      // Validate that the focus mode belongs to the user
      const focusMode = await this.focusModeRepository.orm.findOne({
        where: { id: blockingScheduleDto.focus_mode_id, user_id: userId },
      });

      if (!focusMode) {
        throw new BadRequestException('Focus mode not found or does not belong to user');
      }

      // Validate time format and logic
      this.validateTimeFormat(blockingScheduleDto.start_time);
      this.validateTimeFormat(blockingScheduleDto.end_time);

      const existingSchedule = await this.blockingScheduleRepository.orm.findOne({
        where: { id, user_id: userId },
      });

      if (!existingSchedule) {
        throw new NotFoundException('Blocking schedule not found');
      }

      // Exclude id to prevent IDOR vulnerability - use the id from URL parameter
      const { id: dtoId, ...dtoWithoutId } = blockingScheduleDto;
      Object.assign(existingSchedule, {
        ...dtoWithoutId,
        start_time: this.normalizeTimeFormat(blockingScheduleDto.start_time),
        end_time: this.normalizeTimeFormat(blockingScheduleDto.end_time),
        user_id: userId,
        days_of_week: blockingScheduleDto.days_of_week || [0, 1, 2, 3, 4, 5, 6],
        pause_friction: blockingScheduleDto.pause_friction || PauseFriction.NONE,
        block_level: blockingScheduleDto.block_level || BlockLevel.STRICT,
        is_ai_blocking_enabled: blockingScheduleDto.is_ai_blocking_enabled || false,
        metadata: blockingScheduleDto.metadata || null,
      });

      return await this.blockingScheduleRepository.orm.save(existingSchedule);
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async deleteBlockingSchedule(userId: string, id: string): Promise<void> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Deleting blocking schedule',
        data: { userId, id },
      });

      const blockingSchedule = await this.blockingScheduleRepository.orm.findOne({
        where: { id, user_id: userId },
      });

      if (!blockingSchedule) {
        throw new NotFoundException('Blocking schedule not found');
      }

      await this.blockingScheduleRepository.orm.remove(blockingSchedule);
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  private validateTimeFormat(time: string): void {
    // Support both HH:MM and HH:MM:SS formats (PostgreSQL time type returns HH:MM:SS)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
    if (!timeRegex.test(time)) {
      throw new BadRequestException('Invalid time format. Use HH:MM or HH:MM:SS format (24-hour)');
    }
  }

  private normalizeTimeFormat(time: string): string {
    // Convert HH:MM:SS to HH:MM for consistency
    return time.substring(0, 5);
  }
}
