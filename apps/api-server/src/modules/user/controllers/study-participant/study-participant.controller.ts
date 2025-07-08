import { Controller, Post, Body, UseGuards, Get, Query } from '@nestjs/common';
import { ApiSecurity, ApiTags, ApiResponse } from '@nestjs/swagger';
import { AuthContext } from '../../../../shared/decorators/passport.decorator';
import { Passport } from '../../../auth/domain/passport.model';
import { StudyParticipantService } from '../../services/study-participant/study-participant.service';
import {
  AddParticipantDetailsDto,
  LinkUserToParticipantCodeDto,
  VerifyParticipantCodeInfoDto,
} from '../../dto/study-participant';
import { IsAuth } from '../../../auth/guards/is-auth/is-auth.guard';
import { AppActivationStatus } from '../../entities/study-participant.entity';
import { SaveFlankerTestResultDto } from '../../dto/study-participant/save-flanker-test-result.dto';

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

  @Post('mark-complete-questionnaire')
  @UseGuards(IsAuth)
  async markCompleteQuestionnaire(@AuthContext() { user }: Passport): Promise<void> {
    await this.studyParticipantService.markCompleteQuestionnaire(user.id);
  }

  @Post('mark-eos-questionnaire-completed')
  @UseGuards(IsAuth)
  async markEndOfStudyQuestionnaireCompleted(@AuthContext() { user }: Passport): Promise<void> {
    await this.studyParticipantService.markEndOfStudyQuestionnaireCompleted(user.id);
  }

  @Post('save-flanker-test-result')
  @UseGuards(IsAuth)
  async saveFlankerTestResult(@AuthContext() { user }: Passport, @Body() dto: SaveFlankerTestResultDto): Promise<void> {
    await this.studyParticipantService.saveFlankerTestResult(user.id, dto);
  }

  @Get('group-statistics')
  @ApiResponse({
    status: 200,
    description: 'Returns statistics about participant distribution across groups and characteristics',
  })
  async getGroupStatistics() {
    return this.studyParticipantService.getGroupStatistics();
  }
}
