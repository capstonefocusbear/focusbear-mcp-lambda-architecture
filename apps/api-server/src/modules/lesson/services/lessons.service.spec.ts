import { Test } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import {
  DummyCourseOne,
  DummyCourseOneLessons,
  DummyCreateCLessonCompletionDto,
  DummyCreateLessonDto,
  DummyUpdateLessonDto,
} from '../../../../test/dummies/online-courses.dummies';
import { SentryServiceMock } from '../../../../test/mocks';
import { LessonsRepositoryMock } from '../../../../test/mocks/repositories.mock';
import { LessonsRepository } from '../repositories/lessons.repository';
import { LessonsService } from './lessons.service';
import { nonExistUserDummy, userDummy } from '../../../../test/dummies';
import { UserTypes } from '../../user/domain/user-types.enum';

describe('LessonsService', () => {
  let lessonsService: LessonsService;

  beforeEach(async () => {
    jest.resetAllMocks();
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        LessonsService,
        LessonsRepository,
        {
          provide: SENTRY_TOKEN,
          useValue: SentryServiceMock,
        },
      ],
    })
      .overrideProvider(LessonsRepository)
      .useValue(LessonsRepositoryMock)
      .compile();
    lessonsService = moduleRef.get<LessonsService>(LessonsService);
  });

  it('positive: should be defined', () => {
    expect(lessonsService).toBeDefined();
  });

  describe('getLessons', () => {
    it('positive: should fetch course lessons', async () => {
      LessonsRepositoryMock.getCourseLessons.mockResolvedValueOnce(DummyCourseOneLessons);
      const result = await lessonsService.getLessons(DummyCourseOne.id);
      expect(result).toEqual(DummyCourseOneLessons);
    });
  });

  describe('createLessons', () => {
    it("negative: should throw NotFoundException when a course couldn't be found in DB", async () => {
      LessonsRepositoryMock.checkForeignKeyCourseIdExist.mockResolvedValueOnce(null);
      const responseMessage = `Course with course_id ${DummyCreateLessonDto.course_id} couldn't be found`;
      let exception: any;
      try {
        await lessonsService.createLessons(DummyCreateLessonDto);
      } catch (error) {
        exception = error;
      }
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toMatch(responseMessage);
    });

    it('positive: should create course lessons', async () => {
      LessonsRepositoryMock.checkForeignKeyCourseIdExist.mockResolvedValueOnce(DummyCourseOne);
      await lessonsService.createLessons(DummyCreateLessonDto);
      expect(LessonsRepositoryMock.createCourseLessons).toBeCalledWith(DummyCreateLessonDto);
    });
  });

  describe('updateLessons', () => {
    it("negative: should throw NotFoundException when a course couldn't be found in DB", async () => {
      LessonsRepositoryMock.checkForeignKeyCourseIdExist.mockResolvedValueOnce(null);
      const responseMessage = `Course with course_id ${DummyUpdateLessonDto.course_id} couldn't be found`;
      let exception: any;
      try {
        await lessonsService.updateLessons(DummyUpdateLessonDto, userDummy.id, [UserTypes.STANDARD]);
      } catch (error) {
        exception = error;
      }
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toMatch(responseMessage);
    });

    it("negative: should throw NotFoundException when a lesson couldn't be found in DB", async () => {
      LessonsRepositoryMock.checkForeignKeyCourseIdExist.mockResolvedValueOnce(DummyCourseOne);
      LessonsRepositoryMock.checkForeignKeyLessonIdExist.mockResolvedValueOnce(null);
      const responseMessage = `Lesson with lesson_id ${DummyUpdateLessonDto.lesson_id} couldn't be found`;
      let exception: any;
      try {
        await lessonsService.updateLessons(DummyUpdateLessonDto, userDummy.id, [UserTypes.STANDARD]);
      } catch (error) {
        exception = error;
      }
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toMatch(responseMessage);
    });

    it("negative: should throw ForbiddenException, if the user isn't the author of the lesson", async () => {
      LessonsRepositoryMock.checkForeignKeyCourseIdExist.mockResolvedValueOnce(DummyCourseOne);
      LessonsRepositoryMock.checkForeignKeyLessonIdExist.mockResolvedValueOnce(DummyCourseOneLessons[0].id);
      const responseMessage = `User with user_id ${nonExistUserDummy.id} not allowed to perform the operation`;
      let exception: any;
      try {
        await lessonsService.updateLessons(DummyUpdateLessonDto, nonExistUserDummy.id, [UserTypes.STANDARD]);
      } catch (error) {
        exception = error;
      }
      expect(exception).toBeInstanceOf(ForbiddenException);
      expect(exception.message).toMatch(responseMessage);
    });

    it('positive: should update course lessons, if the user is an author the course', async () => {
      LessonsRepositoryMock.checkForeignKeyCourseIdExist.mockResolvedValueOnce(DummyCourseOne);
      LessonsRepositoryMock.checkForeignKeyLessonIdExist.mockResolvedValueOnce(DummyCourseOneLessons[0].id);
      await lessonsService.updateLessons(DummyUpdateLessonDto, userDummy.id, [UserTypes.STANDARD]);
      expect(LessonsRepositoryMock.updateCourseLessons).toBeCalledWith(DummyUpdateLessonDto);
    });

    it('positive: should update course lessons, if the user is an admin', async () => {
      LessonsRepositoryMock.checkForeignKeyCourseIdExist.mockResolvedValueOnce(DummyCourseOne);
      LessonsRepositoryMock.checkForeignKeyLessonIdExist.mockResolvedValueOnce(DummyCourseOneLessons[0].id);
      await lessonsService.updateLessons(DummyUpdateLessonDto, nonExistUserDummy.id, [UserTypes.ADMIN]);
      expect(LessonsRepositoryMock.updateCourseLessons).toBeCalledWith(DummyUpdateLessonDto);
    });
  });

  describe('createCompletedLesson', () => {
    it("negative: should throw NotFoundException when a course couldn't be found in DB", async () => {
      LessonsRepositoryMock.checkForeignKeyCourseIdExist.mockResolvedValueOnce(null);
      const responseMessage = `Course with course_id ${DummyCourseOne.id} couldn't be found`;
      let exception: any;
      try {
        await lessonsService.createCompletedLesson(DummyCreateCLessonCompletionDto, userDummy.id);
      } catch (error) {
        exception = error;
      }
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toMatch(responseMessage);
    });

    it("negative: should throw NotFoundException when a lesson couldn't be found in DB", async () => {
      LessonsRepositoryMock.checkForeignKeyCourseIdExist.mockResolvedValueOnce(DummyCourseOne);
      LessonsRepositoryMock.checkForeignKeyLessonIdExist.mockResolvedValueOnce(null);
      const responseMessage = `Lesson with lesson_id ${DummyCourseOneLessons[0].id} couldn't be found`;
      let exception: any;
      try {
        await lessonsService.createCompletedLesson(DummyCreateCLessonCompletionDto, userDummy.id);
      } catch (error) {
        exception = error;
      }
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toMatch(responseMessage);
    });

    it('positive: should create and save, if the lesson completed', async () => {
      LessonsRepositoryMock.checkForeignKeyCourseIdExist.mockResolvedValueOnce(DummyCourseOne);
      LessonsRepositoryMock.checkForeignKeyLessonIdExist.mockResolvedValueOnce(DummyCourseOneLessons[0].id);
      await lessonsService.createCompletedLesson(DummyCreateCLessonCompletionDto, userDummy.id);
      expect(LessonsRepositoryMock.createLessonCompletion).toBeCalledWith(
        {
          lesson_id: DummyCourseOneLessons[0].id,
          course_id: DummyCourseOne.id,
        },
        userDummy.id,
      );
    });
  });
});
