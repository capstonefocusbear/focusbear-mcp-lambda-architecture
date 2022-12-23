import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { In } from 'typeorm';
import { ResponseMessage } from '../../../shared/domain/response-message.model';
import { FocusMode } from '../../focus-mode/entities/focus-mode.entity';
import { FocusModeRepository } from '../../focus-mode/repositories/focus-mode.repository';
import { UserTypes } from '../../user/domain/user-types.enum';
import { UserRepository } from '../../user/repositories/user.repository';
import { GetMultipleFocusModeTemplatesQueryDto } from '../dto/get-multiple-focus-mode-templates-query.dto';
import { UpsertFocusModeTemplateDto } from '../dto/upsert-focus-mode-template.dto';
import { FocusModeTemplate } from '../entities/focus-mode-template.entity';
import { FocusModeTemplatesRepository } from '../repositories/focus-mode-templates.repository';
import { InstalledFocusModeTemplatesRepository } from '../repositories/installed-focus-mode-templates.reporisoty';

@Injectable()
export class FocusModeTemplatesService {
  constructor(
    private readonly focusModeTemplateRepository: FocusModeTemplatesRepository,
    private readonly focusModeRepository: FocusModeRepository,
    private readonly userRepository: UserRepository,
    private readonly installedFocusModeTeplatesRepository: InstalledFocusModeTemplatesRepository,
    @InjectSentry() private readonly sentryService: SentryService,
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
      const { marketplace_approval_status } = focusModeTemplateDto;
      let approvalStatus;
      // eslint-disable-next-line prettier/prettier, operator-linebreak
      const approvalStatusHasChanged =
        marketplace_approval_status !== existingFocusModeTemplate?.marketplace_approval_status;
      const approvalStatusIsFalse = typeof marketplace_approval_status !== 'undefined' && !marketplace_approval_status;
      if (userIsAdmin) {
        approvalStatus = marketplace_approval_status;
      } else if (approvalStatusHasChanged && approvalStatusIsFalse) {
        approvalStatus = false;
      } else {
        approvalStatus = existingFocusModeTemplate?.marketplace_approval_status ?? false;
      }
      const focusModeTemplate = new FocusModeTemplate({
        ...focusModeTemplateDto,
        author_id: user.id,
        author_name: user.name,
        marketplace_approval_status: approvalStatus,
      });
      return await this.focusModeTemplateRepository.upsert(focusModeTemplate, ['id']);
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
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
      const installedFocusModeTemplate = await this.installedFocusModeTeplatesRepository.orm.findOne({
        where: { user_id, focus_mode_template_id: template_id },
      });
      if (installedFocusModeTemplate?.installation_status) {
        throw new BadRequestException(
          `User with ID: ${user_id} already has focus mode template with ID: ${template_id} installed!`,
        );
      }
      if (installedFocusModeTemplate) {
        // if installation record already exists but focus mode is not currently installed, update existing record as installed
        this.installedFocusModeTeplatesRepository.orm.update(installedFocusModeTemplate.id, {
          installation_status: true,
        });
      } else {
        // if focus mode template has not been installed before, create new install record
        this.installedFocusModeTeplatesRepository.create({
          user_id,
          focus_mode_template_id: template_id,
          installation_status: true,
        });
      }
      const { name, allowed_apps, allowed_urls } = focusModeTemplate;
      const createdFocusMode = await this.focusModeRepository.create({
        user_id,
        name,
        allowed_apps,
        allowed_urls,
        focus_mode_template_id: template_id,
      });
      return createdFocusMode;
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
      const userInstallLogs = await this.installedFocusModeTeplatesRepository.orm.find({
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
}
