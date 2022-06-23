import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { ResponseMessage } from '../../../../shared/domain/response-message.model';
import { AuthContext } from '../../../../shared/decorators/passport.decorator';
import { Passport } from '../../../auth/domain/passport.model';
import { IsAuth } from '../../../auth/guards/is-auth/is-auth.guard';
import { FinishFocusModeDto } from '../../dto/finish-focus-mode.dto';
import { GetFocusModeParamsDto } from '../../dto/get-focus-mode-params.dto';
import { StartFocusModeDto } from '../../dto/start-focus-mode.dto';
import { FocusModeService } from '../../services/focus-mode/focus-mode.service';

@Controller('focus-mode')
@ApiTags('focus-mode')
@UseGuards(IsAuth)
@ApiSecurity('Auth0AccessToken')
export class FocusModeController {
  constructor(private readonly focusModeService: FocusModeService) {}

  @Post(':focus_mode_id/start')
  async startCurrentFocusMode(
    @Body() { finish_time, intention, start_time }: StartFocusModeDto,
    @Param() { focus_mode_id }: GetFocusModeParamsDto,
    @AuthContext() { user }: Passport,
  ): Promise<ResponseMessage> {
    await this.focusModeService.startCurrentFocusMode(
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
    await this.focusModeService.finishCurrentFocusMode(
      { achievements, distractions, finish_time },
      { focus_mode_id },
      user.id,
    );
    return new ResponseMessage('Focus mode has been successfully finished!');
  }
}
