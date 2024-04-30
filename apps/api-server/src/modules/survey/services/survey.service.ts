/* eslint-disable */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { CreateSurveyDto } from '../dto/create-survey.dto';
import { CreateSurveyAnswerDto } from '../dto/create-survey-answer.dto';
import { SurveyRepository } from '../repositories/survey.repository';
import { UserRepository } from '../../user/repositories/user.repository';
import { UpdateSurveyDto } from '../dto/update-survey.dto';

@Injectable()
export class SurveyService {
  constructor(
    @InjectSentry() private readonly sentryService: SentryService,
    private readonly surveyRepository: SurveyRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async createSurvey(createSurveyDto: CreateSurveyDto, user_id: string) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'create survey',
        data: {
          ...createSurveyDto,
          user_id,
        },
      });

      const user = await this.userRepository.orm.findOne({ where: { id: user_id } });
      if (!user) {
        throw new NotFoundException(`User with user_id ${user_id} couldn't be found`);
      }
      await this.surveyRepository.createSurvey(createSurveyDto, user_id);
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async updateSurvey(updateSurveyDto: UpdateSurveyDto, user_id: string) {}

  async createSurveyAnswer(createSurveyAnswerDto: CreateSurveyAnswerDto, survey_id: string, user_id: string) {}

  async updateSurveyCompletion(survey_id: string, user_id: string) {}

  async getUnansweredSurveys(user_id: string) {}

  async getAnsweredSurveys(user_id: string) {}
}
