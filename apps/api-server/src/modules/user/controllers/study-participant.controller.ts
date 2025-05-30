import { Controller, Post, Body, UseGuards, Get } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AuthContext } from '@api-server/shared/decorators/passport.decorator';
import { Passport } from '@api-server/modules/auth/domain/passport.model';
import { StudyParticipantService } from '../services/study-participant/study-participant.service';
import {
  AddParticipantDetailsDto,
  LinkUserToParticipantCodeDto,
  VerifyParticipantCodeInfoDto,
  ParticipantInfoResponseDto,
} from '../dto/study-participant';
import { IsAuth } from '../../auth/guards/is-auth/is-auth.guard';

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

  @Get('get-unicas-participant-info')
  @UseGuards(IsAuth)
  async getParticipantInfo(@AuthContext() { user }: Passport): Promise<ParticipantInfoResponseDto> {
    return this.studyParticipantService.getParticipantByUserId(user.id);
  }
}
