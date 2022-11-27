import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { ResponseMessage } from '../../../../shared/domain/response-message.model';
import { AuthContext } from '../../../../shared/decorators/passport.decorator';
import { Passport } from '../../../auth/domain/passport.model';
import { IsAuth } from '../../../auth/guards/is-auth/is-auth.guard';
import { FinishFocusModeDto } from '../../dto/finish-focus-mode.dto';
import { GetFocusModeParamsDto } from '../../dto/get-focus-mode-params.dto';
import { StartFocusModeDto } from '../../dto/start-focus-mode.dto';
import { FocusModeManagerService } from '../../services/focus-mode-manager/focus-mode-manager.service';
import { FocusModeService } from '../../services/focus-mode/focus-mode.service';
import { FocusMode } from '../../entities/focus-mode.entity';
import { CreateFocusModeDto } from '../../dto/create-focus-mode.dto';
import { UpdateFocusModeDto } from '../../dto/update-focus-mode.dto';
import { BulckDeleteQueryDto } from '../../dto/bulck-delete-query.dto';

@Controller('focus-mode')
@ApiTags('focus-mode')
@UseGuards(IsAuth)
@ApiSecurity('Auth0AccessToken')
export class FocusModeController {
  constructor(
    private readonly focusModeManagerService: FocusModeManagerService,
    private readonly focusModeService: FocusModeService,
  ) {}

  @Post()
  async createFocusMode(
    @Body() { name, allowed_apps, allowed_urls, metadata, id }: CreateFocusModeDto,
    @AuthContext() { user }: Passport,
  ): Promise<FocusMode> {
    return this.focusModeService.create({ id, name, allowed_apps, allowed_urls, metadata, user_id: user.id });
  }

  @Patch(':focus_mode_id')
  async updateFocusMode(
    @Body() { name, allowed_apps, allowed_urls, metadata }: UpdateFocusModeDto,
    @Param() { focus_mode_id }: GetFocusModeParamsDto,
  ): Promise<FocusMode> {
    return this.focusModeService.update(focus_mode_id, { name, allowed_apps, allowed_urls, metadata });
  }

  @Put()
  async updateFocusModes(
    @Body() focusModes: CreateFocusModeDto[],
    @AuthContext() { user }: Passport,
  ): Promise<FocusMode[]> {
    return this.focusModeService.updateFocusModes(user.id, focusModes);
  }

  @Get()
  async fetchFocusModes(@AuthContext() { user }: Passport): Promise<FocusMode[]> {
    return this.focusModeService.fetchUserFocusModes(user.id);
  }

  @Delete()
  @HttpCode(204)
  async bulkDeleteFocusModes(@Query() { id }: BulckDeleteQueryDto): Promise<void> {
    return this.focusModeService.softDelete(id);
  }

  @Post(':focus_mode_id/start')
  async startCurrentFocusMode(
    @Body() { finish_time, intention, start_time }: StartFocusModeDto,
    @Param() { focus_mode_id }: GetFocusModeParamsDto,
    @AuthContext() { user }: Passport,
  ): Promise<ResponseMessage> {
    await this.focusModeManagerService.startCurrentFocusMode(
      { finish_time, intention, start_time },
      { focus_mode_id },
      user.id,
    );
    return new ResponseMessage('Focus mode has been successfully started!');
  }

  @Post(':focus_mode_id/finish')
  async finishCurrentFocusMode(
    @Body() { achievements, distractions, finish_time }: FinishFocusModeDto,
    @Param() { focus_mode_id }: GetFocusModeParamsDto,
    @AuthContext() { user }: Passport,
  ): Promise<ResponseMessage> {
    await this.focusModeManagerService.finishCurrentFocusMode(
      { achievements, distractions, finish_time },
      { focus_mode_id },
      user.id,
    );
    return new ResponseMessage('Focus mode has been successfully finished!');
  }
}
