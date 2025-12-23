import { HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectSentry, SentryService } from '@app/observability';
import { randomUUID } from 'crypto';
import { BaseCRUDService } from '../../../../shared/services/base-crud.service';
import { InstalledFocusModeTemplatesRepository } from '../../../focus-mode-template/repositories/installed-focus-mode-templates.reporisoty';
import { UpdateFocusModeDto } from '../../dto/update-focus-mode.dto';
import { FocusMode } from '../../entities/focus-mode.entity';
import { FocusModeRepository } from '../../repositories/focus-mode.repository';
import { CreateFocusModeDto } from '../../dto/create-focus-mode.dto';
import { FocusModeTag } from '../../entities/focus-mode-tags';
import { FocusModeTagRepository } from '../../repositories/focus-mode-tags.repository';
import { CreateFocusModeTagDto } from '../../dto/create-focus-mode-tag.dto';
import { UserDailyStatsService } from '../../../user/services/user-daily-stats/user-daily-stats.service';
import { UserProgressUpdateTypes } from '../../../user/domain/user-progress-update-types.enum';

@Injectable()
export class FocusModeService extends BaseCRUDService<FocusModeRepository, FocusMode> {
  constructor(
    private readonly repo: FocusModeRepository,
    private readonly focusModeRepository: FocusModeRepository,
    @InjectSentry() private readonly sentryService: SentryService,
    private readonly installedFocusModeTemplatesRepository: InstalledFocusModeTemplatesRepository,
    private readonly focusModeTagRepository: FocusModeTagRepository,
    private readonly userDailyStatsService: UserDailyStatsService,
  ) {
    super(repo);
  }

  async fetchUserFocusModes(user_id: string): Promise<FocusMode[]> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Fetching user focus modes',
        data: {
          user_id,
        },
      });
      const focusModes = await this.focusModeRepository.orm.find({ where: { user_id } });
      return focusModes;
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async updateFocusModes(user_id: string, focusModes: UpdateFocusModeDto[]): Promise<FocusMode[]> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Updating user focus modes',
        data: {
          user_id,
        },
      });
      await Promise.all(
        focusModes.map(async (focusMode) => {
          const fetchedFocusMode = await this.focusModeRepository.orm.findOneBy({ id: focusMode.id });
          let focusModeTags = [];
          if (focusMode?.tags && focusMode?.tags?.length) {
            focusModeTags = await this.saveFocusModeTags(user_id, focusMode?.tags);
          }
          const updatedFocusMode = { ...fetchedFocusMode, ...focusMode, tags: focusModeTags };
          await this.focusModeRepository.orm.save(updatedFocusMode);
        }),
      );
      await this.userDailyStatsService.updateUserOnboardingProgress(user_id, UserProgressUpdateTypes.EDIT_FOCUS_MODE);
      return await this.fetchUserFocusModes(user_id);
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async deleteFocusMode(id: string) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Deleting focus mode',
        data: {
          id,
        },
      });
      const focusMode = await this.focusModeRepository.orm.findOneBy({ id });
      // if focus mode is from an installed focus mode template, mark as uninstalled
      if (focusMode?.focus_mode_template_id) {
        const { user_id, focus_mode_template_id } = focusMode;
        const installedRecord = await this.installedFocusModeTemplatesRepository.orm.findOne({
          where: { user_id, focus_mode_template_id, installation_status: true },
        });
        this.installedFocusModeTemplatesRepository.orm.update(installedRecord.id, { installation_status: false });
      }
      this.focusModeRepository.orm.softDelete(id);
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async createFocusMode(user_id: string, focusModeDto: CreateFocusModeDto): Promise<FocusMode> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Creating focus mode',
        data: {
          user_id,
        },
      });
      const { tags } = focusModeDto;
      let focusModeTags = [];
      if (tags?.length) {
        focusModeTags = await this.saveFocusModeTags(user_id, tags);
      }
      const existingFocusModes = await this.focusModeRepository.orm.find({ where: { user_id } });
      await this.validateFocusModeName(focusModeDto.name, user_id, existingFocusModes);
      const createdFocusMode = new FocusMode({
        id: focusModeDto.id ?? randomUUID(),
        user_id,
        name: focusModeDto.name,
        metadata: focusModeDto.metadata,
        allowed_apps: focusModeDto.allowed_apps,
        allowed_urls: focusModeDto.allowed_urls,
        tags: focusModeTags,
      });
      const savedFocusMode = await this.focusModeRepository.orm.save(createdFocusMode);
      // check that focus mode is not one created by default when installing one of the apps
      // and if so, update onboarding progress
      const isNotDefaultFocusMode =
        !focusModeDto?.metadata?.isDefault &&
        !focusModeDto?.metadata?.isMeetings &&
        !focusModeDto?.metadata?.isLockedFocus &&
        !focusModeDto?.metadata?.isRelaxFocus;
      if (isNotDefaultFocusMode) {
        await this.userDailyStatsService.updateUserOnboardingProgress(user_id, UserProgressUpdateTypes.EDIT_FOCUS_MODE);
      }
      return savedFocusMode;
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'warning' });
      throw error;
    }
  }

  async validateFocusModeName(name: string, userId: string, existingFocusModes: FocusMode[]) {
    const focusModeNames = existingFocusModes.map((focusMode) => focusMode.name.toLowerCase());
    if (focusModeNames.includes(name?.toLowerCase())) {
      throw new HttpException(`Focus mode with name: ${name} already exists for user with ID: ${userId}!`, 422);
    }
  }

  async updateFocusMode(
    user_id: string,
    focus_mode_id: string,
    updateFocusModeDto: UpdateFocusModeDto,
  ): Promise<FocusMode> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Updating focus mode',
        data: {
          user_id,
        },
      });
      const focusMode = await this.focusModeRepository.orm.findOne({ where: { id: focus_mode_id } });
      if (!focusMode) {
        throw new NotFoundException(`Focus mode with ID: ${focus_mode_id} does not exist`);
      }
      const { tags } = updateFocusModeDto;
      const existingFocusModes = await this.focusModeRepository.orm.find({ where: { user_id } });
      await this.validateFocusModeName(updateFocusModeDto.name, user_id, existingFocusModes);
      await this.deleteRemovedFocusModeTags(user_id, focusMode?.tags, tags);
      let focusModeTags = [];
      if (tags?.length) {
        focusModeTags = await this.saveFocusModeTags(user_id, tags);
      }
      const updateFocusMode = new FocusMode({
        ...focusMode,
        ...updateFocusModeDto,
        user_id,
        id: focus_mode_id,
        tags: focusModeTags,
      });
      await this.userDailyStatsService.updateUserOnboardingProgress(user_id, UserProgressUpdateTypes.EDIT_FOCUS_MODE);
      return await this.focusModeRepository.orm.save(updateFocusMode);
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'warning' });
      throw error;
    }
  }

  async saveFocusModeTags(user_id: string, tags: CreateFocusModeTagDto[]): Promise<FocusModeTag[]> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Saving focus mode tags',
        data: {
          user_id,
        },
      });
      const newlyCreatedTags = tags?.map(
        (tag) => new FocusModeTag({ id: tag.id ?? randomUUID(), user_id, text: tag.text }),
      );
      await Promise.all(newlyCreatedTags?.map((newTag) => this.focusModeTagRepository.upsert(newTag, ['id'])));
      return newlyCreatedTags;
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async deleteRemovedFocusModeTags(
    user_id: string,
    existingTags: FocusModeTag[],
    incomingTags: CreateFocusModeTagDto[],
  ) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Deleting focus mode tags',
        data: {
          user_id,
          existingTags,
          incomingTags,
        },
      });
      const existingTagsIds = existingTags?.map((tag) => tag.id);
      const incomingTagsId = incomingTags?.map((tag) => tag?.id && tag.id);
      await Promise.all(
        existingTagsIds.map((id) => {
          if (!incomingTagsId.includes(id)) {
            return this.focusModeTagRepository.orm.delete({ id, user_id });
          }
          return null;
        }),
      );
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async getUserFocusTags(user_id: string): Promise<Partial<FocusModeTag>[]> {
    return this.focusModeTagRepository.orm.find({ where: { user_id }, select: ['id', 'text'] });
  }

  async upsertFocusModeTag(tag: CreateFocusModeTagDto, user_id: string) {
    const newTag = new FocusModeTag({ ...tag, user_id });
    return this.focusModeTagRepository.upsert(newTag, ['id']);
  }

  async deleteFocusModeTag(tag_id: string, user_id: string) {
    return this.focusModeTagRepository.orm.delete({ id: tag_id, user_id });
  }
}
