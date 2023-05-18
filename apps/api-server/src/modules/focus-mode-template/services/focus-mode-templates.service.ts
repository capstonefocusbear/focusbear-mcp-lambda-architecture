import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { In } from 'typeorm';
import { convert as htmlToPlainText } from 'html-to-text';
import { ResponseMessage } from '../../../shared/domain/response-message.model';
import { FocusMode } from '../../focus-mode/entities/focus-mode.entity';
import { FocusModeRepository } from '../../focus-mode/repositories/focus-mode.repository';
import { UserTypes } from '../../user/domain/user-types.enum';
import { User } from '../../user/entities/user.entity';
import { UserRepository } from '../../user/repositories/user.repository';
import { GetMultipleFocusModeTemplatesQueryDto } from '../dto/get-multiple-focus-mode-templates-query.dto';
import { UpsertFocusModeTemplateDto } from '../dto/upsert-focus-mode-template.dto';
import { FocusModeTemplate } from '../entities/focus-mode-template.entity';
import { FocusModeTemplatesRepository } from '../repositories/focus-mode-templates.repository';
import { InstalledFocusModeTemplatesRepository } from '../repositories/installed-focus-mode-templates.reporisoty';
import { FocusModeTagRepository } from '../../focus-mode/repositories/focus-mode-tags.repository';
import { FocusModeTag } from '../../focus-mode/entities/focus-mode-tags';
import { FocusModeService } from '../../focus-mode/services/focus-mode/focus-mode.service';
import { CreateFocusModeTagDto } from '../../focus-mode/dto/create-focus-mode-tag.dto';

@Injectable()
export class FocusModeTemplatesService {
  constructor(
    private readonly focusModeTemplateRepository: FocusModeTemplatesRepository,
    private readonly focusModeRepository: FocusModeRepository,
    private readonly userRepository: UserRepository,
    private readonly installedFocusModeTemplatesRepository: InstalledFocusModeTemplatesRepository,
    @InjectSentry() private readonly sentryService: SentryService,
    private readonly focusModeTagRepository: FocusModeTagRepository,
    private readonly focusModeService: FocusModeService,
  ) {}

  async upsertFocusModeTemplate(
    focusModeTemplateDto: UpsertFocusModeTemplateDto,
    user_id: string,
  ): Promise<FocusModeTemplate> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'creating or updating focus mode template',
        data: {
          user_id,
        },
      });
      const user = await this.userRepository.orm.findOneBy({ id: user_id });
      if (!user) throw new NotFoundException(`User with ID: ${user_id} does not exist!`);
      // allow users to revoke marketplace approval, but not approve
      // admin users are allow to approve marketplace approval
      const userIsAdmin = user.user_type === UserTypes.ADMIN;
      const existingFocusModeTemplate = await this.focusModeTemplateRepository.orm.findOneBy({
        id: focusModeTemplateDto.id,
      });
      if (existingFocusModeTemplate && existingFocusModeTemplate.author_id !== user_id && !userIsAdmin) {
        throw new UnauthorizedException(
          `User with ID: ${user_id} is not authorized to edit focus mode template with ID: ${focusModeTemplateDto.id}!`,
        );
      }
      const { marketplaceApprovalStatus, isFeatured, isFeaturedForOnboarding } = this.determineAdminProperties(
        userIsAdmin,
        focusModeTemplateDto,
        existingFocusModeTemplate,
      );
      const { author_name, tags } = focusModeTemplateDto;
      const authorName = this.determineFocusTemplateAuthorName(
        existingFocusModeTemplate,
        user,
        author_name,
        userIsAdmin,
      );
      if (existingFocusModeTemplate) {
        await this.deleteRemovedFocusTemplateTags(user_id, existingFocusModeTemplate?.tags, tags);
      }
      let focusModeTags = [];
      if (tags && tags?.length) {
        focusModeTags = await this.focusModeService.saveFocusModeTags(user_id, tags);
      }
      const focusModeTemplate = new FocusModeTemplate({
        ...focusModeTemplateDto,
        tags: focusModeTags,
        description_plain_text: htmlToPlainText(focusModeTemplateDto.description),
        welcome_message_plain_text: htmlToPlainText(focusModeTemplateDto.welcome_message),
        author_id: user.id,
        author_name: authorName,
        marketplace_approval_status: marketplaceApprovalStatus,
        is_featured: isFeatured,
        featured_for_onboarding: isFeaturedForOnboarding,
      });
      return await this.focusModeTemplateRepository.orm.save(focusModeTemplate);
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
  }

  determineFocusTemplateAuthorName(
    focusTemplate: FocusModeTemplate,
    user: User,
    upsertName: string,
    userIsAdmin: boolean,
  ) {
    // allow admin user to edit author name, if not admin, use existing creator name, if new pack, use user's name
    const ifExistingFocusTemplateUseSetName = focusTemplate ? focusTemplate.author_name : user.name;
    const creatorNameToUse = userIsAdmin ? upsertName : ifExistingFocusTemplateUseSetName;
    return creatorNameToUse;
  }

  determineAdminProperties(
    userIsAdmin: boolean,
    upsertFocusMode: UpsertFocusModeTemplateDto,
    existingFocusTemplate: FocusModeTemplate,
  ) {
    const { marketplace_approval_status, is_featured, featured_for_onboarding } = upsertFocusMode;
    let marketplaceApprovalStatus;
    let isFeatured;
    let isFeaturedForOnboarding;
    const hasExistingMarketplaceStatus = typeof existingFocusTemplate?.marketplace_approval_status === 'boolean';
    const existingMarketplaceStatus = existingFocusTemplate?.marketplace_approval_status;
    const hasExistingIsFeaturedStatus = typeof existingFocusTemplate?.is_featured === 'boolean';
    const existingIsFeaturedStatus = existingFocusTemplate?.is_featured;
    const hasExistingIsFeaturedForOnboardingStatus =
      typeof existingFocusTemplate?.featured_for_onboarding === 'boolean';
    const existingIsFeaturedForOnboardingStatus = existingFocusTemplate?.featured_for_onboarding;
    if (userIsAdmin) {
      marketplaceApprovalStatus = marketplace_approval_status;
      isFeatured = is_featured;
      isFeaturedForOnboarding = featured_for_onboarding;
    } else {
      marketplaceApprovalStatus = hasExistingMarketplaceStatus ? existingMarketplaceStatus : false;
      isFeatured = hasExistingIsFeaturedStatus ? existingIsFeaturedStatus : false;
      isFeaturedForOnboarding = hasExistingIsFeaturedForOnboardingStatus
        ? existingIsFeaturedForOnboardingStatus
        : false;
    }
    return { marketplaceApprovalStatus, isFeatured, isFeaturedForOnboarding };
  }

  async deleteFocusModeTemplate(template_id: string, user_id: string) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'deleting focus mode template',
        data: {
          user_id,
          template_id,
        },
      });
      const user = await this.userRepository.orm.findOneBy({ id: user_id });
      if (!user) throw new NotFoundException(`User with ID: ${user_id} does not exist!`);
      const focusModeTemplate = await this.focusModeTemplateRepository.orm.findOneBy({ id: template_id });
      if (!focusModeTemplate) {
        throw new NotFoundException(`Focus mode template with ID: ${template_id} does not exist!`);
      }
      if (user.id !== focusModeTemplate.author_id && user.user_type !== UserTypes.ADMIN) {
        throw new UnauthorizedException(
          `User with ID: ${user_id} is not authorized to delete focus mode template with ID: ${template_id}`,
        );
      }
      await this.focusModeTemplateRepository.orm.softDelete({ id: template_id });
      return new ResponseMessage(`Focus mode template with ID: ${template_id} successfully deleted!`);
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
  }

  async installFocusModeForUser(template_id: string, user_id: string): Promise<FocusMode> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'installing focus mode template',
        data: {
          user_id,
          template_id,
        },
      });
      const user = await this.userRepository.orm.findOneBy({ id: user_id });
      if (!user) throw new NotFoundException(`User with ID: ${user_id} does not exist!`);
      const focusModeTemplate = await this.focusModeTemplateRepository.orm.findOneBy({ id: template_id });
      if (!focusModeTemplate) {
        throw new NotFoundException(`Focus mode template with ID: ${template_id} does not exist!`);
      }
      const installedFocusModeTemplate = await this.installedFocusModeTemplatesRepository.orm.findOne({
        where: { user_id, focus_mode_template_id: template_id },
      });
      if (installedFocusModeTemplate?.installation_status) {
        throw new BadRequestException({
          message: `User with ID: ${user_id} already has focus mode template with ID: ${template_id} installed!`,
          donotloginslack: true,
        });
      }
      if (installedFocusModeTemplate) {
        // if installation record already exists but focus mode is not currently installed, update existing record as installed
        this.installedFocusModeTemplatesRepository.orm.update(installedFocusModeTemplate.id, {
          installation_status: true,
        });
      } else {
        // if focus mode template has not been installed before, create new install record
        this.installedFocusModeTemplatesRepository.create({
          user_id,
          focus_mode_template_id: template_id,
          installation_status: true,
        });
      }
      const { name, allowed_apps, allowed_urls, tags } = focusModeTemplate;
      const tagsCreatedFromTemplate = tags?.map(({ text }) => new FocusModeTag({ text, user_id }));
      await this.focusModeTagRepository.orm.save(tagsCreatedFromTemplate);
      const createdFocusMode = new FocusMode({
        user_id,
        name,
        allowed_apps,
        allowed_urls,
        focus_mode_template_id: template_id,
        tags: tagsCreatedFromTemplate,
      });
      return await this.focusModeRepository.orm.save(createdFocusMode);
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
  }

  async getMultipleFocusModeTemplates(
    getTemplatesQuery: GetMultipleFocusModeTemplatesQueryDto,
    user_id: string,
  ): Promise<FocusModeTemplate[]> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'installing focus mode template',
        data: {
          user_id,
          getTemplatesQuery,
        },
      });
      const user = await this.userRepository.orm.findOneBy({ id: user_id });
      if (!user) throw new NotFoundException(`User with ID: ${user_id} does not exist!`);
      const templates = await this.focusModeTemplateRepository.fetchTemplatesByFilter(getTemplatesQuery);
      return templates;
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
  }

  async getUserInstalledTemplates(user_id: string): Promise<FocusModeTemplate[]> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'installing focus mode template',
        data: {
          user_id,
        },
      });
      const user = await this.userRepository.orm.findOneBy({ id: user_id });
      if (!user) throw new NotFoundException(`User with ID: ${user_id} does not exist!`);
      const userInstallLogs = await this.installedFocusModeTemplatesRepository.orm.find({
        where: { user_id, installation_status: true },
      });
      const userInstalledTemplateIds = userInstallLogs.map(
        (focusModeTemplate) => focusModeTemplate.focus_mode_template_id,
      );
      const useInstalledFocusModes = await this.focusModeTemplateRepository.orm.find({
        where: { id: In(userInstalledTemplateIds) },
      });
      return useInstalledFocusModes;
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
  }

  async deleteRemovedFocusTemplateTags(
    user_id: string,
    existingTags: FocusModeTag[],
    incomingTags: CreateFocusModeTagDto[],
  ) {
    const existingTagsIds = existingTags?.map((tag) => tag.id);
    const incomingTagsIds = incomingTags?.map((tag) => tag?.id && tag.id);
    await Promise.all(
      existingTagsIds.map((id) => {
        if (!incomingTagsIds.includes(id)) {
          return this.focusModeTagRepository.orm.delete({ id, user_id });
        }
        return null;
      }),
    );
  }
}
