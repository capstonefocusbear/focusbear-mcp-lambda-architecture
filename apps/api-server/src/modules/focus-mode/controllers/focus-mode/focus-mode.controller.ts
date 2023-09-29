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
import { BulkDeleteQueryDto } from '../../dto/bulck-delete-query.dto';
import { CreateFocusModeTagDto } from '../../dto/create-focus-mode-tag.dto';
import { DeleteFocusModeTagQuery } from '../../dto/delete-focus-mode-tag-query.dto';

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
    @Body() focusModeDto: CreateFocusModeDto,
    @AuthContext() { user }: Passport,
  ): Promise<FocusMode> {
    return this.focusModeService.createFocusMode(user.id, focusModeDto);
  }

  @Patch(':focus_mode_id')
  async updateFocusMode(
    @Body() updateFocusModeDto: UpdateFocusModeDto,
    @Param() { focus_mode_id }: GetFocusModeParamsDto,
    @AuthContext() { user }: Passport,
  ): Promise<FocusMode> {
    return this.focusModeService.updateFocusMode(user.id, focus_mode_id, updateFocusModeDto);
  }

  @Put()
  async updateFocusModes(
    @Body() focusModes: UpdateFocusModeDto[],
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
  async bulkDeleteFocusModes(@Query() { id }: BulkDeleteQueryDto) {
    return this.focusModeService.deleteFocusMode(id);
  }

  @Post(':focus_mode_id/start')
  async startCurrentFocusMode(
    @Body() startFocusModeData: StartFocusModeDto,
    @Param() { focus_mode_id }: GetFocusModeParamsDto,
    @AuthContext() { user }: Passport,
  ): Promise<ResponseMessage> {
    await this.focusModeManagerService.startCurrentFocusMode(startFocusModeData, { focus_mode_id }, user.id);
    return new ResponseMessage('Focus mode has been successfully started!');
  }

  @Post(':focus_mode_id/finish')
  async finishCurrentFocusMode(
    @Body() finishFocusModeDto: FinishFocusModeDto,
    @Param() { focus_mode_id }: GetFocusModeParamsDto,
    @AuthContext() { user }: Passport,
  ): Promise<ResponseMessage> {
    await this.focusModeManagerService.finishCurrentFocusMode(finishFocusModeDto, { focus_mode_id }, user.id);
    return new ResponseMessage('Focus mode has been successfully finished!');
  }

  @Get('tags')
  async getUserFocusTags(@AuthContext() { user }: Passport) {
    return this.focusModeService.getUserFocusTags(user.id);
  }

  @Put('tags')
  async upsertFocusModeTag(@Body() tag: CreateFocusModeTagDto, @AuthContext() { user }: Passport) {
    return this.focusModeService.upsertFocusModeTag(tag, user.id);
  }

  @Delete('tags')
  @HttpCode(204)
  async deleteFocusModeTag(@Query() { tag_id }: DeleteFocusModeTagQuery, @AuthContext() { user }: Passport) {
    return this.focusModeService.deleteFocusModeTag(tag_id, user.id);
  }
}
