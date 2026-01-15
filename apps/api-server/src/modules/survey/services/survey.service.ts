import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectSentry, SentryService } from '@app/observability';
import { CreateSurveyDto } from '../dto/create-survey.dto';
import { CreateSurveyAnswerDto } from '../dto/create-survey-answer.dto';
import { SurveyRepository } from '../repositories/survey.repository';
import { UserRepository } from '../../user/repositories/user.repository';
import { UpdateSurveyDto } from '../dto/update-survey.dto';
import { SurveyAnswerRepository } from '../repositories/survey-answer.repository';
import { PaginationOptionsDto } from '../../../shared/pagination/pagination-options.dto';
import { PaginationMetaDto } from '../../../shared/pagination/pagination-meta.dto';
import { PaginationDto } from '../../../shared/pagination/index.dto';
import { SurveyAnswerMetadataRepository } from '../repositories/survey-answer-metadata.repository';

@Injectable()
export class SurveyService {
  constructor(
    @InjectSentry() private readonly sentryService: SentryService,
    private readonly surveyRepository: SurveyRepository,
    private readonly userRepository: UserRepository,
    private readonly surveyAnswerRepository: SurveyAnswerRepository,
    private readonly surveyAnswerMetadataRepository: SurveyAnswerMetadataRepository,
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

      await this.validateUser(user_id);
      await this.surveyRepository.createSurvey(createSurveyDto, user_id);
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async updateSurvey(updateSurveyDto: UpdateSurveyDto, user_id: string) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'update survey',
        data: {
          ...updateSurveyDto,
          user_id,
        },
      });

      await this.validateUser(user_id);
      const survey = await this.validateSurvey(updateSurveyDto.survey_id);
      survey.question = updateSurveyDto.question;
      survey.choices = updateSurveyDto.choices;
      await this.surveyRepository.updateSurvey(survey);
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async createSurveyAnswer(createSurveyAnswerDto: CreateSurveyAnswerDto, survey_id: string, user_id: string) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'create survey answer',
        data: {
          ...createSurveyAnswerDto,
          survey_id,
          user_id,
        },
      });

      await this.validateUser(user_id);
      const survey = await this.validateSurvey(survey_id);
      const foundAnswer = survey.choices?.length ? survey.choices.includes(createSurveyAnswerDto.reply) : true;
      if (!foundAnswer) {
        throw new BadRequestException(
          `Survey answer ${createSurveyAnswerDto.reply} should be one of survey choices: ${survey.choices?.join(',')}`,
        );
      }
      const { metadata, ...rest } = createSurveyAnswerDto;
      const answer = await this.surveyAnswerRepository.createSurveyAnswer(rest, survey_id, user_id);
      await this.surveyAnswerMetadataRepository.createSurveyAnswerMetadata(metadata, survey_id, user_id, answer.id);
      return answer;
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async updateSurveyCompletion(survey_id: string, completed: boolean, user_id: string) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'update survey completion',
        data: {
          survey_id,
          user_id,
        },
      });

      await this.validateUser(user_id);
      await this.validateSurvey(survey_id);
      const surveyAnswer = await this.surveyAnswerRepository.getSurveyAnswer(survey_id, user_id);
      if (!surveyAnswer) {
        throw new NotFoundException(
          `Previous survey answer of a user with ${user_id} and survey_id ${survey_id} couldn't be found`,
        );
      }
      await this.surveyAnswerRepository.updateSurveyAnswerCompletion(survey_id, user_id, completed);
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async getUserUnansweredSurveys(user_id: string) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'get user unanswered surveys',
        data: { user_id },
      });
      await this.validateUser(user_id);
      return await this.surveyRepository.getUserUnansweredSurveys();
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async getUserUncompletedSurveys(user_id: string) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'get user uncompleted surveys',
        data: {
          user_id,
        },
      });

      await this.validateUser(user_id);
      return await this.surveyRepository.getUserSurveys(user_id, false);
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async getUserCompletedSurveys(user_id: string) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'get user completed surveys',
        data: {
          user_id,
        },
      });

      await this.validateUser(user_id);
      return await this.surveyRepository.getUserSurveys(user_id, true);
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async getSurveys(paginationOptionsDto: PaginationOptionsDto, user_id: string) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'get surveys',
        data: {
          ...paginationOptionsDto,
          user_id,
        },
      });
      await this.validateUser(user_id);
      const [surveys, total] = await this.surveyRepository.getSurveys(paginationOptionsDto);
      return new PaginationDto(surveys, new PaginationMetaDto({ paginationOptionsDto, itemCount: total }));
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async validateUser(user_id: string) {
    const user = await this.userRepository.orm.findOne({ where: { id: user_id } });
    if (!user) {
      throw new NotFoundException(`User with user_id ${user_id} couldn't be found`);
    }
  }

  async validateSurvey(survey_id: string) {
    const survey = await this.surveyRepository.getSurvey(survey_id);
    if (!survey) {
      throw new NotFoundException(`Survey with survey_id ${survey_id} couldn't be found`);
    }
    return survey;
  }
}
