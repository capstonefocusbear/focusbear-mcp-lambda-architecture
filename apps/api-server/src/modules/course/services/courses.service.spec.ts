import { Test } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import { SentryServiceMock } from '../../../../test/mocks';
import { CoursesRepositoryMock } from '../../../../test/mocks/repositories.mock';
import { CoursesRepository } from '../repositories/courses.repository';
import { CoursesService } from './courses.service';
import { adminUserDummy, nonExistUserDummy, userDummy } from '../../../../test/dummies';
import {
  DummyCourseEnrolments,
  DummyCourseOne,
  DummyCourseRatings,
  DummyCourseThree,
  DummyCourseTwo,
  DummyCreateCourseDto,
  DummyCreateCourseEnrolmentDto,
  DummyCreateCourseRatingDto,
  DummyUpdateCourseDto,
  DummyUpdateCourseEnrolmentDto,
} from '../../../../test/dummies/online-courses.dummies';
import { UserTypes } from '../../user/domain/user-types.enum';
import { Platform } from '../../../shared/domain/platform.enum';

describe('CoursesService', () => {
  let coursesService: CoursesService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        CoursesService,
        CoursesRepository,
        {
          provide: SENTRY_TOKEN,
          useValue: SentryServiceMock,
        },
      ],
    })
      .overrideProvider(CoursesRepository)
      .useValue(CoursesRepositoryMock)
      .compile();
    coursesService = moduleRef.get<CoursesService>(CoursesService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('positive: should be defined', () => {
    expect(coursesService).toBeDefined();
  });

  describe('getAllCourses', () => {
    it('positive: should fetch courses', async () => {
      CoursesRepositoryMock.getAllCourses.mockResolvedValueOnce([DummyCourseOne, DummyCourseThree]);
      const result = await coursesService.getAllCourses({
        skip: 50,
      });
      expect(result).toMatchObject([DummyCourseOne, DummyCourseThree]);
    });
  });

  describe('createCourse', () => {
    it("negative: should throw NotFoundException when a user couldn't be found in DB", async () => {
      CoursesRepositoryMock.checkForeignKeyUserIdExist.mockResolvedValueOnce(undefined);
      const responseMessage = `User with user_id ${userDummy.id} couldn't be found`;
      let exception: any;
      try {
        await coursesService.createCourse(DummyCreateCourseDto, userDummy.id);
      } catch (error) {
        exception = error;
      }
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toMatch(responseMessage);
    });

    it('positive: should create course contents', async () => {
      CoursesRepositoryMock.checkForeignKeyUserIdExist.mockResolvedValueOnce(userDummy);
      await coursesService.createCourse(DummyCreateCourseDto, userDummy.id);
      expect(CoursesRepositoryMock.createCourseContent).toHaveBeenCalledWith(
        {
          ...DummyCreateCourseDto,
        },
        userDummy.id,
      );
    });
  });

  describe('getCourseDetails', () => {
    it("negative: should throw NotFoundException if the course couldn't be found in DB", async () => {
      CoursesRepositoryMock.getCourseDetails.mockResolvedValueOnce(null);
      const responseMessage = `Course with course_id ${DummyCourseTwo.id} couldn't be found`;
      let exception: any;
      try {
        await coursesService.getCourseDetails(DummyCourseTwo.id, userDummy.id);
      } catch (error) {
        exception = error;
      }
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toMatch(responseMessage);
    });

    it('positive: should return course content', async () => {
      CoursesRepositoryMock.getCourseDetails.mockResolvedValueOnce(DummyCourseTwo);
      await coursesService.getCourseDetails(DummyCourseTwo.id, userDummy.id);
      expect(CoursesRepositoryMock.getCourseDetails).toHaveBeenCalledWith(DummyCourseTwo.id);
    });
  });

  describe('updateCourse', () => {
    it("negative: should throw NotFoundException if the course couldn't be found in DB", async () => {
      CoursesRepositoryMock.checkForeignKeyCourseIdExist.mockResolvedValueOnce(null);
      const responseMessage = `Course with course_id ${DummyCourseTwo.id} couldn't be found`;
      let exception: any;
      try {
        await coursesService.updateCourse(DummyUpdateCourseDto, DummyCourseTwo.id, userDummy.id, [UserTypes.STANDARD]);
      } catch (error) {
        exception = error;
      }
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toMatch(responseMessage);
    });

    it("negative: should throw ForbiddenException, if the user isn't the author of the course", async () => {
      CoursesRepositoryMock.checkForeignKeyCourseIdExist.mockResolvedValueOnce(DummyCourseTwo);
      const responseMessage = `User with user_id ${userDummy.id} not allowed to perform the operation`;
      let exception: any;
      try {
        await coursesService.updateCourse(DummyUpdateCourseDto, DummyCourseTwo.id, userDummy.id, [UserTypes.STANDARD]);
      } catch (error) {
        exception = error;
      }
      expect(exception).toBeInstanceOf(ForbiddenException);
      expect(exception.message).toMatch(responseMessage);
    });

    it('positive: should update course content if the user is the author of the course', async () => {
      CoursesRepositoryMock.checkForeignKeyCourseIdExist.mockResolvedValueOnce(DummyCourseOne);
      await coursesService.updateCourse(DummyUpdateCourseDto, DummyCourseOne.id, userDummy.id, [UserTypes.STANDARD]);
      expect(CoursesRepositoryMock.updateCourseContent).toHaveBeenCalledWith(DummyUpdateCourseDto, DummyCourseOne.id);
    });

    it('positive: should update course content if the user is has an admin role', async () => {
      CoursesRepositoryMock.checkForeignKeyCourseIdExist.mockResolvedValueOnce(DummyCourseTwo);
      await coursesService.updateCourse(DummyUpdateCourseDto, DummyCourseOne.id, adminUserDummy.id, [UserTypes.ADMIN]);
      expect(CoursesRepositoryMock.updateCourseContent).toHaveBeenCalledWith(DummyUpdateCourseDto, DummyCourseOne.id);
    });
  });

  describe('deleteCourse', () => {
    it("negative: should throw NotFoundException when a course couldn't be found in DB", async () => {
      CoursesRepositoryMock.checkForeignKeyCourseIdExist.mockResolvedValueOnce(null);
      const responseMessage = `Course with course_id ${DummyCourseTwo.id} couldn't be found`;
      let exception: any;
      try {
        await coursesService.deleteCourse(DummyCourseTwo.id, { deleted: true }, [UserTypes.ADMIN]);
      } catch (error) {
        exception = error;
      }
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toMatch(responseMessage);
    });

    it("negative: should throw ForbiddenException, if the user isn't an ADMIN", async () => {
      CoursesRepositoryMock.checkForeignKeyCourseIdExist.mockResolvedValueOnce(DummyCourseTwo);
      const responseMessage = 'User not allowed to perform the operation';
      let exception: any;
      try {
        await coursesService.deleteCourse(DummyCourseTwo.id, { deleted: true }, [UserTypes.STANDARD]);
      } catch (error) {
        exception = error;
      }
      expect(exception).toBeInstanceOf(ForbiddenException);
      expect(exception.message).toMatch(responseMessage);
    });

    it('positive: should delete the course, if the user role has an admin role', async () => {
      CoursesRepositoryMock.checkForeignKeyCourseIdExist.mockResolvedValueOnce(DummyCourseTwo);
      await coursesService.deleteCourse(DummyCourseTwo.id, { deleted: true }, [UserTypes.ADMIN]);
      expect(CoursesRepositoryMock.updateCourseDeleted).toHaveBeenCalledWith(DummyCourseTwo.id, true);
    });
  });

  describe('hideCourse', () => {
    it("negative: should throw NotFoundException when a course couldn't be found in DB", async () => {
      CoursesRepositoryMock.checkForeignKeyCourseIdExist.mockResolvedValueOnce(null);
      const responseMessage = `Course with course_id ${DummyCourseTwo.id} couldn't be found`;
      let exception: any;
      try {
        await coursesService.hideCourse(DummyCourseTwo.id, { should_hide: true }, [UserTypes.ADMIN]);
      } catch (error) {
        exception = error;
      }
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toMatch(responseMessage);
    });

    it("negative: should throw ForbiddenException, if the user isn't an ADMIN", async () => {
      CoursesRepositoryMock.checkForeignKeyCourseIdExist.mockResolvedValueOnce(DummyCourseTwo);
      const responseMessage = 'User not allowed to perform the operation';
      let exception: any;
      try {
        await coursesService.hideCourse(DummyCourseTwo.id, { should_hide: true }, [UserTypes.STANDARD]);
      } catch (error) {
        exception = error;
      }
      expect(exception).toBeInstanceOf(ForbiddenException);
      expect(exception.message).toMatch(responseMessage);
    });

    it('positive: should hide the course, if the user has an admin role', async () => {
      CoursesRepositoryMock.checkForeignKeyCourseIdExist.mockResolvedValueOnce(DummyCourseOne);
      await coursesService.hideCourse(DummyCourseOne.id, { should_hide: true }, [UserTypes.ADMIN]);
      expect(CoursesRepositoryMock.updateCourseHidden).toHaveBeenCalledWith(DummyCourseOne.id, true);
    });
  });

  describe('getCourseRatings', () => {
    it('positive: should fetch course ratings', async () => {
      CoursesRepositoryMock.getRatings.mockResolvedValueOnce(
        DummyCourseRatings.filter((rating) => rating.course_id === DummyCourseOne.id),
      );
      const result = await coursesService.getCourseRatings(DummyCourseOne.id);
      expect(CoursesRepositoryMock.getRatings).toHaveBeenCalledWith(DummyCourseOne.id);
      expect(result).toEqual(DummyCourseRatings.filter((rating) => rating.course_id === DummyCourseOne.id));
    });
  });

  describe('createCourseRating', () => {
    it("negative: should throw NotFoundException when a user with a course couldn't be found in course enrolment", async () => {
      CoursesRepositoryMock.checkUserCourseEnrolment.mockResolvedValueOnce(null);
      const responseMessage = `Course enrolment with course_id ${DummyCreateCourseRatingDto.course_id} couldn't be found`;
      let exception: any;
      try {
        await coursesService.createCourseRating(DummyCreateCourseRatingDto, userDummy.id);
      } catch (error) {
        exception = error;
      }
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toMatch(responseMessage);
    });

    it('positive: should create a course rating', async () => {
      CoursesRepositoryMock.checkUserCourseEnrolment.mockResolvedValueOnce(DummyCourseEnrolments[0]);
      await coursesService.createCourseRating(DummyCreateCourseRatingDto, userDummy.id);
      expect(CoursesRepositoryMock.createRatingContent).toHaveBeenCalledWith(DummyCreateCourseRatingDto, userDummy.id);
    });
  });

  describe('createCourseEnrolment', () => {
    it("negative: should throw NotFoundException when a user couldn't be found in DB", async () => {
      CoursesRepositoryMock.checkForeignKeyUserIdExist.mockResolvedValueOnce(null);
      const responseMessage = `User with user_id ${nonExistUserDummy.id} couldn't be found`;
      let exception: any;
      try {
        await coursesService.createCourseEnrolment(DummyCreateCourseEnrolmentDto, nonExistUserDummy.id);
      } catch (error) {
        exception = error;
      }
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toMatch(responseMessage);
    });

    it("negative: should throw NotFoundException when a course couldn't be found in DB", async () => {
      CoursesRepositoryMock.checkForeignKeyUserIdExist.mockResolvedValueOnce(userDummy);
      CoursesRepositoryMock.checkForeignKeyCourseIdExist.mockResolvedValueOnce(null);
      const responseMessage = `Course with course_id ${DummyCreateCourseEnrolmentDto.course_id} couldn't be found`;
      let exception: any;
      try {
        await coursesService.createCourseEnrolment(DummyCreateCourseEnrolmentDto, userDummy.id);
      } catch (error) {
        exception = error;
      }
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toMatch(responseMessage);
    });

    it('positive: should create a course enrolment', async () => {
      CoursesRepositoryMock.checkForeignKeyUserIdExist.mockResolvedValueOnce(userDummy);
      CoursesRepositoryMock.checkForeignKeyCourseIdExist.mockResolvedValueOnce(DummyCourseOne);
      await coursesService.createCourseEnrolment(DummyCreateCourseEnrolmentDto, userDummy.id);
      expect(CoursesRepositoryMock.createEnrolmentContent).toHaveBeenCalledWith(
        DummyCreateCourseEnrolmentDto.course_id,
        userDummy.id,
      );
    });
  });

  describe('updateCourseEnrolment', () => {
    it("negative: should throw NotFoundException when a user couldn't be found in DB", async () => {
      CoursesRepositoryMock.checkForeignKeyUserIdExist.mockResolvedValueOnce(null);
      const responseMessage = `User with user_id ${nonExistUserDummy.id} couldn't be found`;
      let exception: any;
      try {
        await coursesService.updateCourseEnrolment(DummyUpdateCourseEnrolmentDto, nonExistUserDummy.id);
      } catch (error) {
        exception = error;
      }
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toMatch(responseMessage);
    });

    it("negative: should throw NotFoundException when a course couldn't be found in DB", async () => {
      CoursesRepositoryMock.checkForeignKeyUserIdExist.mockResolvedValueOnce(userDummy);
      CoursesRepositoryMock.checkForeignKeyCourseIdExist.mockResolvedValueOnce(DummyCourseTwo);
      CoursesRepositoryMock.checkUserCourseEnrolment.mockResolvedValueOnce(null);
      const responseMessage = `Course enrolment with course_id ${DummyCourseTwo.id} couldn't be found`;
      let exception: any;
      try {
        await coursesService.updateCourseEnrolment(DummyUpdateCourseEnrolmentDto, userDummy.id);
      } catch (error) {
        exception = error;
      }
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toMatch(responseMessage);
    });

    it("negative: should throw NotFoundException when a course enrolment of a user couldn't be found in DB", async () => {
      CoursesRepositoryMock.checkForeignKeyUserIdExist.mockResolvedValueOnce(userDummy);
      CoursesRepositoryMock.checkForeignKeyCourseIdExist.mockResolvedValueOnce(DummyCourseTwo);
      CoursesRepositoryMock.checkUserCourseEnrolment.mockResolvedValueOnce(null);
      const responseMessage = `Course enrolment with course_id ${DummyCourseEnrolments[1].course_id} couldn't be found`;
      let exception: any;
      try {
        await coursesService.updateCourseEnrolment(DummyUpdateCourseEnrolmentDto, userDummy.id);
      } catch (error) {
        exception = error;
      }
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toMatch(responseMessage);
    });

    it('positive: should update a course enrolment status when a user enrolment found in DB ', async () => {
      CoursesRepositoryMock.checkForeignKeyUserIdExist.mockResolvedValueOnce(userDummy);
      CoursesRepositoryMock.checkForeignKeyCourseIdExist.mockResolvedValueOnce(DummyCourseTwo);
      CoursesRepositoryMock.checkUserCourseEnrolment.mockResolvedValueOnce(DummyCourseEnrolments[0]);
      await coursesService.updateCourseEnrolment(DummyUpdateCourseEnrolmentDto, userDummy.id);
      expect(CoursesRepositoryMock.updateEnrolmentStatus).toHaveBeenCalledWith(DummyUpdateCourseEnrolmentDto);
    });
  });

  describe('getUserCreatedCourses', () => {
    it('positive: should fetch user created courses', async () => {
      CoursesRepositoryMock.getAllAuthorCourses.mockResolvedValueOnce([DummyCourseOne, DummyCourseThree]);
      const result = await coursesService.getUserCreatedCourses({ hidden: false, deleted: false }, userDummy.id);
      expect(result).toMatchObject([DummyCourseOne, DummyCourseThree]);
    });
  });

  describe('getUserNotEnrolledCourses', () => {
    it('positive: should fetch user not enrolled courses', async () => {
      CoursesRepositoryMock.getUserNotEnrolledCourses.mockResolvedValueOnce([DummyCourseThree]);
      const result = await coursesService.getUserNotEnrolledCourses(userDummy.id);
      expect(result).toMatchObject([DummyCourseThree]);
    });
  });

  describe('syncPlatformCourses', () => {
    it('positive: should sync platform courses', async () => {
      CoursesRepositoryMock.getPlatformCourses.mockResolvedValueOnce([DummyCourseTwo, DummyCourseThree]);
      await coursesService.syncPlatformCourses({ platform: Platform.MAC }, userDummy.id);
      expect(CoursesRepositoryMock.getPlatformCourses).toHaveBeenCalledWith(Platform.MAC);
      expect(CoursesRepositoryMock.createEnrolmentContent).toHaveBeenCalledTimes(2);
      expect(CoursesRepositoryMock.createEnrolmentContent).toHaveBeenNthCalledWith(1, DummyCourseTwo.id, userDummy.id);
      expect(CoursesRepositoryMock.createEnrolmentContent).toHaveBeenNthCalledWith(
        2,
        DummyCourseThree.id,
        userDummy.id,
      );
    });
  });
});
