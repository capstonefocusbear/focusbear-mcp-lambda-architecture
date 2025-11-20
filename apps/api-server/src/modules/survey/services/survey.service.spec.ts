import { Test } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SurveyService } from './survey.service';
import { SurveyRepository } from '../repositories/survey.repository';
import { SurveyAnswerRepository } from '../repositories/survey-answer.repository';
import { SurveyAnswerMetadataRepository } from '../repositories/survey-answer-metadata.repository';
import {
  SentryServiceMock,
  SurveyAnswerRepositoryMock,
  SurveyAnswerMetadataRepositoryMock,
  SurveyRepositoryMock,
  UserRepositoryMock,
} from '../../../../test/mocks';
import { UserRepository } from '../../user/repositories/user.repository';
import {
  dummyCreateSurveyAnswerDto,
  dummyCreateSurveyDto,
  dummyPaginationOptionsDto,
  dummySurveyAnswers,
  dummySurveys,
  dummyUpdateSurveyDto,
  userDummy,
} from '../../../../test/dummies';
import { Survey } from '../entities/survey.entity';
import { PaginationDto } from '../../../shared/pagination/index.dto';
import { PaginationMetaDto } from '../../../shared/pagination/pagination-meta.dto';

describe('surveyService', () => {
  let surveyService: SurveyService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        SurveyService,
        SurveyRepository,
        SurveyAnswerRepository,
        SurveyAnswerMetadataRepository,
        UserRepository,
        {
          provide: SENTRY_TOKEN,
          useValue: SentryServiceMock,
        },
      ],
    })
      .overrideProvider(SurveyRepository)
      .useValue(SurveyRepositoryMock)
      .overrideProvider(SurveyAnswerRepository)
      .useValue(SurveyAnswerRepositoryMock)
      .overrideProvider(SurveyAnswerMetadataRepository)
      .useValue(SurveyAnswerMetadataRepositoryMock)
      .overrideProvider(UserRepository)
      .useValue(UserRepositoryMock)
      .compile();

    jest.clearAllMocks();
    jest.resetAllMocks();

    surveyService = moduleRef.get<SurveyService>(SurveyService);
  });

  it('should be defined', () => {
    expect(surveyService).toBeDefined();
  });

  describe('createSurvey', () => {
    it("negative: given that the user auth token is invalid, should return that the user couldn't be found", async () => {
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(null);
      const errorMessage = `User with user_id ${userDummy.id} couldn't be found`;
      let exception: any;
      try {
        await surveyService.createSurvey(dummyCreateSurveyDto, userDummy.id);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: should save new survey', async () => {
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userDummy);
      await surveyService.createSurvey(dummyCreateSurveyDto, userDummy.id);
      expect(SurveyRepositoryMock.createSurvey).toHaveBeenCalledWith(dummyCreateSurveyDto, userDummy.id);
    });
  });

  describe('updateSurvey', () => {
    it("negative: given that the user auth token is invalid, should return that the user couldn't be found", async () => {
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(null);
      const errorMessage = `User with user_id ${userDummy.id} couldn't be found`;
      let exception: any;
      try {
        await surveyService.createSurvey(dummyCreateSurveyDto, userDummy.id);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it("negative: should return that the survey couldn't not found", async () => {
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userDummy);
      SurveyRepositoryMock.getSurvey.mockResolvedValueOnce(null);
      const errorMessage = `Survey with survey_id ${dummySurveys[0].id} couldn't be found`;
      let exception: any;
      try {
        await surveyService.updateSurvey(dummyUpdateSurveyDto, userDummy.id);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: should update an existing survey', async () => {
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userDummy);
      SurveyRepositoryMock.getSurvey.mockResolvedValueOnce(dummySurveys[0]);

      await surveyService.updateSurvey(dummyUpdateSurveyDto, userDummy.id);
      const { survey_id, ...rest } = dummyUpdateSurveyDto;

      expect(SurveyRepositoryMock.updateSurvey).toHaveBeenCalledWith(
        new Survey({
          ...dummySurveys[0],
          ...rest,
        }),
      );
    });
  });

  describe('createSurveyAnswer', () => {
    it("negative: given that the user auth token is invalid, should return that the user couldn't be found", async () => {
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(null);
      const errorMessage = `User with user_id ${userDummy.id} couldn't be found`;
      let exception: any;
      try {
        await surveyService.createSurvey(dummyCreateSurveyDto, userDummy.id);
      } catch (error) {
        exception = error;
      }
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it("negative: should return that the survey couldn't not found", async () => {
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userDummy);
      SurveyRepositoryMock.getSurvey.mockResolvedValueOnce(null);
      const errorMessage = `Survey with survey_id ${dummySurveys[0].id} couldn't be found`;
      let exception: any;
      try {
        await surveyService.createSurveyAnswer(dummyCreateSurveyAnswerDto.VALID, dummySurveys[0].id, userDummy.id);
      } catch (error) {
        exception = error;
      }
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('negative: should return that survey answer should be one of the choices', async () => {
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userDummy);
      SurveyRepositoryMock.getSurvey.mockResolvedValueOnce(dummySurveys[0]);
      const errorMessage = `Survey answer ${
        dummyCreateSurveyAnswerDto.INVALID.reply
      } should be one of survey choices: ${dummySurveys[0].choices?.join(',')}`;
      let exception: any;
      try {
        await surveyService.createSurveyAnswer(dummyCreateSurveyAnswerDto.INVALID, dummySurveys[0].id, userDummy.id);
      } catch (error) {
        exception = error;
      }
      expect(exception).toBeInstanceOf(BadRequestException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: should create survey answer and metadata', async () => {
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userDummy);
      SurveyRepositoryMock.getSurvey.mockResolvedValueOnce(dummySurveys[0]);
      SurveyAnswerRepositoryMock.createSurveyAnswer.mockResolvedValueOnce(dummySurveyAnswers[0]);

      await surveyService.createSurveyAnswer(dummyCreateSurveyAnswerDto.VALID, dummySurveys[0].id, userDummy.id);

      const { metadata, ...rest } = dummyCreateSurveyAnswerDto.VALID;
      expect(SurveyAnswerRepositoryMock.createSurveyAnswer).toHaveBeenCalledWith(
        rest,
        dummySurveys[0].id,
        userDummy.id,
      );
      expect(SurveyAnswerMetadataRepositoryMock.createSurveyAnswerMetadata).toHaveBeenCalledWith(
        metadata,
        dummySurveys[0].id,
        userDummy.id,
        dummySurveyAnswers[0].id,
      );
    });
  });

  describe('updateSurveyCompletion', () => {
    it("negative: given that the user auth token is invalid, should return that the user couldn't be found", async () => {
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(null);
      const errorMessage = `User with user_id ${userDummy.id} couldn't be found`;
      let exception: any;
      try {
        await surveyService.updateSurveyCompletion(dummySurveys[0].id, true, userDummy.id);
      } catch (error) {
        exception = error;
      }
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it("negative: should return that the survey couldn't not found", async () => {
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userDummy);
      SurveyRepositoryMock.getSurvey.mockResolvedValueOnce(null);
      const errorMessage = `Survey with survey_id ${dummySurveys[0].id} couldn't be found`;
      let exception: any;
      try {
        await surveyService.updateSurveyCompletion(dummySurveys[0].id, true, userDummy.id);
      } catch (error) {
        exception = error;
      }
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it("negative: should return that the previous survey answer couldn't not found", async () => {
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userDummy);
      SurveyRepositoryMock.getSurvey.mockResolvedValueOnce(dummySurveys[0]);
      SurveyAnswerRepositoryMock.getSurveyAnswer(null);
      const errorMessage = `Previous survey answer of a user with ${userDummy.id} and survey_id ${dummySurveys[0].id} couldn't be found`;
      let exception: any;
      try {
        await surveyService.updateSurveyCompletion(dummySurveys[0].id, true, userDummy.id);
      } catch (error) {
        exception = error;
      }
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: should update survey completion', async () => {
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userDummy);
      SurveyRepositoryMock.getSurvey.mockResolvedValueOnce(dummySurveys[0]);
      SurveyAnswerRepositoryMock.getSurveyAnswer.mockResolvedValueOnce(dummySurveyAnswers[0]);

      await surveyService.updateSurveyCompletion(dummySurveys[0].id, true, userDummy.id);

      expect(SurveyAnswerRepositoryMock.updateSurveyAnswerCompletion).toHaveBeenCalledWith(
        dummySurveys[0].id,
        userDummy.id,
        true,
      );
    });
  });

  describe('getUserUnansweredSurveys', () => {
    it("negative: given that the user auth token is invalid, should return that the user couldn't be found", async () => {
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(null);
      const errorMessage = `User with user_id ${userDummy.id} couldn't be found`;
      let exception: any;
      try {
        await surveyService.getUserUnansweredSurveys(userDummy.id);
      } catch (error) {
        exception = error;
      }
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: should return that unanswered surveys of a user', async () => {
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userDummy);
      SurveyRepositoryMock.getUserUnansweredSurveys.mockResolvedValueOnce([dummySurveys[3]]);

      const response = await surveyService.getUserUnansweredSurveys(userDummy.id);
      expect(response).toHaveLength(1);
      expect(response).toEqual([dummySurveys[3]]);
    });
  });

  describe('getUserUncompletedSurveys', () => {
    it("negative: given that the user auth token is invalid, should return that the user couldn't be found", async () => {
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(null);
      const errorMessage = `User with user_id ${userDummy.id} couldn't be found`;
      let exception: any;
      try {
        await surveyService.getUserUncompletedSurveys(userDummy.id);
      } catch (error) {
        exception = error;
      }
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: should return that uncompleted surveys of a user', async () => {
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userDummy);
      SurveyRepositoryMock.getUserSurveys.mockResolvedValueOnce([dummySurveys[0]]);

      const response = await surveyService.getUserUncompletedSurveys(userDummy.id);

      expect(SurveyRepositoryMock.getUserSurveys).toHaveBeenCalledWith(userDummy.id, false);
      expect(response).toHaveLength(1);
      expect(response).toEqual([dummySurveys[0]]);
    });
  });

  describe('getUserCompletedSurveys', () => {
    it("negative: should return the user couldn't not found", async () => {
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(null);
      const errorMessage = `User with user_id ${userDummy.id} couldn't be found`;
      let exception: any;
      try {
        await surveyService.getUserCompletedSurveys(userDummy.id);
      } catch (error) {
        exception = error;
      }
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: should return completed surveys of a user', async () => {
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userDummy);
      SurveyRepositoryMock.getUserSurveys.mockResolvedValueOnce([dummySurveyAnswers[1]]);

      const response = await surveyService.getUserCompletedSurveys(userDummy.id);

      expect(SurveyRepositoryMock.getUserSurveys).toHaveBeenCalledWith(userDummy.id, true);
      expect(response).toHaveLength(1);
      expect(response).toEqual([dummySurveyAnswers[1]]);
    });
  });

  describe('getSurveys', () => {
    it("negative: should return the user couldn't not found", async () => {
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(null);
      const errorMessage = `User with user_id ${userDummy.id} couldn't be found`;
      let exception: any;
      try {
        await surveyService.getSurveys(dummyPaginationOptionsDto, userDummy.id);
      } catch (error) {
        exception = error;
      }
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: should return the surveys with pagination metadata', async () => {
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userDummy);
      SurveyRepositoryMock.getSurveys.mockResolvedValueOnce([dummySurveys, dummySurveys.length]);

      const response = await surveyService.getSurveys(dummyPaginationOptionsDto, userDummy.id);

      expect(response).toEqual(
        new PaginationDto(
          dummySurveys,
          new PaginationMetaDto({ paginationOptionsDto: dummyPaginationOptionsDto, itemCount: dummySurveys.length }),
        ),
      );
    });
  });
});
