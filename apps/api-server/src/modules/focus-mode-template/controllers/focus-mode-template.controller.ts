import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AuthContext } from '../../../shared/decorators/passport.decorator';
import { Passport } from '../../auth/domain/passport.model';
import { IsAuth } from '../../auth/guards/is-auth/is-auth.guard';
import { FocusMode } from '../../focus-mode/entities/focus-mode.entity';
import { GetMultipleFocusModeTemplatesQueryDto } from '../dto/get-multiple-focus-mode-templates-query.dto';
import { UpsertFocusModeTemplateDto } from '../dto/upsert-focus-mode-template.dto';
import { FocusModeTemplate } from '../entities/focus-mode-template.entity';
import { FocusModeTemplatesRepository } from '../repositories/focus-mode-templates.repository';
import { FocusModeTemplatesService } from '../services/focus-mode-templates.service';

@Controller('focus-mode-template')
@ApiTags('focus-mode-template')
export class FocusModeTemplatesController {
  constructor(
    private readonly focusModeTemplateService: FocusModeTemplatesService,
    private readonly focusModeTemplateRepository: FocusModeTemplatesRepository,
  ) {}

  @Put()
  @UseGuards(IsAuth)
  async upsertFocusModeTemplate(
    @Body() focusModeTemplate: UpsertFocusModeTemplateDto,
    @AuthContext() { user }: Passport,
  ): Promise<FocusModeTemplate> {
    return this.focusModeTemplateService.upsertFocusModeTemplate(focusModeTemplate, user.id);
  }

  @Post(':template_id/install')
  @UseGuards(IsAuth)
  @ApiSecurity('Auth0AccessToken')
  async installFocusModeForUser(
    @Param() { template_id }: { template_id: string },
    @AuthContext() { user }: Passport,
  ): Promise<FocusMode> {
    return this.focusModeTemplateService.installFocusModeForUser(template_id, user.id);
  }

  @Get(':template_id')
  async getFocusModeTemplateById(@Param() { template_id }: { template_id: string }): Promise<FocusModeTemplate> {
    return this.focusModeTemplateRepository.orm.findOneBy({ id: template_id });
  }

  @Get()
  async getMultipleFocusModeTemplates(
    @Query() getTemplatesQuery: GetMultipleFocusModeTemplatesQueryDto,
  ): Promise<FocusModeTemplate[]> {
    return this.focusModeTemplateService.getMultipleFocusModeTemplates(getTemplatesQuery);
  }

  @Get('user')
  @UseGuards(IsAuth)
  async getUserFocusModeTemplates(@AuthContext() { user }: Passport): Promise<FocusModeTemplate[]> {
    return this.focusModeTemplateService.getUserFocusModeTemplates(user.id);
  }

  @Get('/user-installed')
  @UseGuards(IsAuth)
  @ApiSecurity('Auth0AccessToken')
  async getUserInstalledFocusModeTemplates(@AuthContext() { user }: Passport): Promise<FocusModeTemplate[]> {
    return this.focusModeTemplateService.getUserInstalledTemplates(user.id);
  }

  @Delete(':template_id')
  @UseGuards(IsAuth)
  @ApiSecurity('Auth0AccessToken')
  async deleteFocusModeTemplate(@Param() { template_id }: { template_id: string }, @AuthContext() { user }: Passport) {
    return this.focusModeTemplateService.deleteFocusModeTemplate(template_id, user.id);
  }
}
