import { Controller, Post, Body, UseGuards, Get, Query } from '@nestjs/common';
import { ApiSecurity, ApiTags, ApiResponse } from '@nestjs/swagger';
import { AuthContext } from '@api-server/shared/decorators/passport.decorator';
import { Passport } from '@api-server/modules/auth/domain/passport.model';
import { StudyParticipantService } from '../../services/study-participant/study-participant.service';
import {
  AddParticipantDetailsDto,
  LinkUserToParticipantCodeDto,
  VerifyParticipantCodeInfoDto,
} from '../../dto/study-participant';
import { IsAuth } from '../../../auth/guards/is-auth/is-auth.guard';
import { AppActivationStatus } from '../../entities/study-participant.entity';

@Controller('study-participants')
@ApiTags('study-participants')
@ApiSecurity('Auth0AccessToken')
export class StudyParticipantController {
  constructor(private readonly studyParticipantService: StudyParticipantService) {}

  @Post('add-participant-details')
  async addParticipantDetails(@Body() dto: AddParticipantDetailsDto): Promise<void> {
    await this.studyParticipantService.addParticipantDetails(dto);
  }

  @Post('verify-participant-code')
  async verifyParticipantCode(@Body() dto: VerifyParticipantCodeInfoDto) {
    return this.studyParticipantService.verifyParticipantCode(dto.participantCode);
  }

  @Post('link-user-to-participant-code')
  @UseGuards(IsAuth)
  async linkUserToParticipantCode(
    @Body() dto: LinkUserToParticipantCodeDto,
    @AuthContext() { user }: Passport,
  ): Promise<{ user_id: string }> {
    return this.studyParticipantService.linkUserToParticipantCode(dto, user.id);
  }

  @Get('get-code-activation-status')
  @ApiResponse({
    status: 200,
    description:
      'Returns the activation status of the participant code, i.e. whether they are still in data collection mode or whether they should have access to the app',
    type: String,
  })
  @UseGuards(IsAuth)
  async getCodeActivationStatus(@Query('participantCode') participantCode: string): Promise<AppActivationStatus> {
    const status = await this.studyParticipantService.getCodeActivationStatus(participantCode);
    return status;
  }

  @Get('get-participant-last-received-data')
  @UseGuards(IsAuth)
  async getParticipantLastReceivedData(@AuthContext() { user }: Passport): Promise<{
    healthDataLastReceived: Date;
    usageDataLastReceived: Date;
  }> {
    return this.studyParticipantService.getParticipantLastReceivedData(user.id);
  }
}
