import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
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
import { userDummy } from '../../../../test/dummies';
import { UserTypes } from '../../user/domain/user-types.enum';

describe('LessonsService', () => {
  let lessonsService: LessonsService;

  beforeAll(async () => {
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

  describe('upsertLessons', () => {
    it("negative: should throw NotFoundException when a course couldn't be found in DB", async () => {
      LessonsRepositoryMock.checkForeignKeyCourseIdExist.mockResolvedValueOnce(null);
      LessonsRepositoryMock.upsertCourseLessons(DummyCreateLessonDto);
      const responseMessage = `Course with course_id ${DummyUpdateLessonDto.course_id} couldn't be found`;
      let exception: any;
      try {
        await lessonsService.upsertLessons(DummyCreateLessonDto, userDummy.id, [UserTypes.STANDARD]);
      } catch (error) {
        exception = error;
      }
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toMatch(responseMessage);
    });

    it('positive: should create course lessons', async () => {
      LessonsRepositoryMock.checkForeignKeyCourseIdExist.mockResolvedValueOnce(DummyCourseOne);
      LessonsRepositoryMock.upsertCourseLessons(DummyCreateLessonDto);
      await lessonsService.upsertLessons(DummyCreateLessonDto, userDummy.id, [UserTypes.STANDARD]);
      expect(LessonsRepositoryMock.upsertCourseLessons).toHaveBeenCalledWith(DummyCreateLessonDto);
    });

    it('positive: should update course lessons, if the user is an admin', async () => {
      LessonsRepositoryMock.checkForeignKeyCourseIdExist.mockResolvedValueOnce(DummyCourseOne);
      LessonsRepositoryMock.upsertCourseLessons(DummyUpdateLessonDto);
      await lessonsService.upsertLessons(DummyUpdateLessonDto, userDummy.id, [UserTypes.ADMIN]);
      expect(LessonsRepositoryMock.upsertCourseLessons).toHaveBeenCalledWith(DummyUpdateLessonDto);
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
      expect(LessonsRepositoryMock.createLessonCompletion).toHaveBeenCalledWith(
        {
          lesson_id: DummyCourseOneLessons[0].id,
          course_id: DummyCourseOne.id,
        },
        userDummy.id,
      );
    });
  });

  describe('deleteLessons', () => {
    it("negative: should throw NotFoundException when a course couldn't be found in DB", async () => {
      LessonsRepositoryMock.checkForeignKeyCourseIdExist.mockResolvedValueOnce(null);
      const responseMessage = `Course with course_id ${DummyCreateLessonDto.course_id} couldn't be found`;
      let exception: any;
      try {
        await lessonsService.deleteCourseLesson({
          lesson_id: DummyCreateLessonDto.lessons[0].id,
          course_id: DummyCreateLessonDto.course_id,
        });
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
        await lessonsService.deleteCourseLesson({
          lesson_id: DummyCreateLessonDto.lessons[0].id,
          course_id: DummyCreateLessonDto.course_id,
        });
      } catch (error) {
        exception = error;
      }
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toMatch(responseMessage);
    });

    it('positive: should delete course lessons', async () => {
      LessonsRepositoryMock.checkForeignKeyCourseIdExist.mockResolvedValueOnce(DummyCourseOne);
      LessonsRepositoryMock.checkForeignKeyLessonIdExist.mockResolvedValueOnce(DummyCourseOneLessons[0].id);
      LessonsRepositoryMock.deleteCourseLesson({
        lesson_id: DummyCreateLessonDto.lessons[0].id,
        course_id: DummyCreateLessonDto.course_id,
      });
      await lessonsService.deleteCourseLesson({
        lesson_id: DummyCreateLessonDto.lessons[0].id,
        course_id: DummyCreateLessonDto.course_id,
      });
      expect(LessonsRepositoryMock.deleteCourseLesson).toHaveBeenCalledWith({
        lesson_id: DummyCreateLessonDto.lessons[0].id,
        course_id: DummyCreateLessonDto.course_id,
      });
    });
  });
});
