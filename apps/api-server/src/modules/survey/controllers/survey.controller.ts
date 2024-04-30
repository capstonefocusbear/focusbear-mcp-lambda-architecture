import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AuthContext } from 'apps/api-server/src/shared/decorators/passport.decorator';
import { IsAuth } from '../../auth/guards/is-auth/is-auth.guard';
import { SurveyService } from '../services/survey.service';
import { CreateSurveyDto } from '../dto/create-survey.dto';
import { CreateSurveyAnswerDto } from '../dto/create-survey-answer.dto';
import { Passport } from '../../auth/domain/passport.model';
import { IsAdmin } from '../../auth/guards/is-admin/is-admin.guard';
import { UpdateSurveyDto } from '../dto/update-survey.dto';

@Controller('survey')
@UseGuards(IsAuth)
@ApiTags('survey')
@ApiSecurity('Auth0AccessToken')
export class SurveyController {
  constructor(private readonly surveyService: SurveyService) {}

  @Post()
  @UseGuards(IsAdmin)
  createSurvey(@Body() createSurveyDto: CreateSurveyDto, @AuthContext() { user }: Passport) {
    return this.surveyService.createSurvey(createSurveyDto, user.id);
  }

  @UseGuards(IsAdmin)
  @Patch()
  async updateSurvey(@Body() updateSurveyDto: UpdateSurveyDto, @AuthContext() { user }: Passport) {
    return this.surveyService.updateSurvey(updateSurveyDto, user.id);
  }

  @Post(':survey_id/answer')
  createSurveyAnswer(
    @Param('survey_id') survey_id: string,
    @Body() createSurveyAnswerDto: CreateSurveyAnswerDto,
    @AuthContext() { user }: Passport,
  ) {
    return this.surveyService.createSurveyAnswer(createSurveyAnswerDto, survey_id, user.id);
  }

  @Patch(':survey_id/completed')
  updateSurveyAnswerCompletion(@Param('survey_id') survey_id: string, @AuthContext() { user }: Passport) {
    return this.surveyService.updateSurveyCompletion(survey_id, user.id);
  }

  @Get('/unanswered')
  getUnansweredSurveys(@AuthContext() { user }: Passport) {
    return this.surveyService.getUnansweredSurveys(user.id);
  }

  @UseGuards(IsAdmin)
  @Get('/answered')
  getAnsweredSurveys(@AuthContext() { user }: Passport) {
    return this.surveyService.getAnsweredSurveys(user.id);
  }
}
