import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AuthContext } from '../../../shared/decorators/passport.decorator';
import { IsAuth } from '../../auth/guards/is-auth/is-auth.guard';
import { SurveyService } from '../services/survey.service';
import { CreateSurveyDto } from '../dto/create-survey.dto';
import { CreateSurveyAnswerDto } from '../dto/create-survey-answer.dto';
import { Passport } from '../../auth/domain/passport.model';
import { IsAdmin } from '../../auth/guards/is-admin/is-admin.guard';
import { UpdateSurveyDto } from '../dto/update-survey.dto';
import { PaginationOptionsDto } from '../../../shared/pagination/pagination-options.dto';

@Controller('survey')
@UseGuards(IsAuth)
@ApiTags('survey')
@ApiSecurity('Auth0AccessToken')
export class SurveyController {
  constructor(private readonly surveyService: SurveyService) {}

  @UseGuards(IsAdmin)
  @Post()
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
  updateSurveyAnswerCompletion(
    @Param('survey_id') survey_id: string,
    @Query('completed') completed: boolean,
    @AuthContext() { user }: Passport,
  ) {
    return this.surveyService.updateSurveyCompletion(survey_id, completed, user.id);
  }

  @Get('/unanswered')
  getUserUnansweredSurveys(@AuthContext() { user }: Passport) {
    return this.surveyService.getUserUnansweredSurveys(user.id);
  }

  @UseGuards(IsAdmin)
  @Get('/answers_completed')
  getAnsweredSurveys(@AuthContext() { user }: Passport) {
    return this.surveyService.getUserCompletedSurveys(user.id);
  }

  @Get('/answers_uncompleted')
  getUnCompletedAnsweredSurveys(@AuthContext() { user }: Passport) {
    return this.surveyService.getUserUncompletedSurveys(user.id);
  }

  @UseGuards(IsAdmin)
  @Get()
  getSurveys(@Query() paginationOptionsDto: PaginationOptionsDto, @AuthContext() { user }: Passport) {
    return this.surveyService.getSurveys(paginationOptionsDto, user.id);
  }
}
