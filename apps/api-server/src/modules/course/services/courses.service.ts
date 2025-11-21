import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { UserTypes } from '../../user/domain/user-types.enum';
import { CreateCourseEnrolmentDto } from '../dto/create-course-enrolment.dto';
import { CreateCourseRatingDto } from '../dto/create-course-rating.dto';
import { CreateCourseDto } from '../dto/create-course.dto';
import { UpdateCourseEnrolmentDto } from '../dto/update-course-enrolment.dto';
import { UpdateCourseDto } from '../dto/update-course.dto';
import { CoursesRepository } from '../repositories/courses.repository';
import { UpdateCourseHideDto } from '../dto/update-course-hide.dto';
import { DeleteCourseDto } from '../dto/delete-course.dto';
import { SyncPlatformCoursesDto } from '../dto/sync-platform-courses.dto';
import { GetUserCoursesDto } from '../dto/get-user-courses.dto';
import { PaginationOptionsDto } from '../../../shared/pagination/pagination-options.dto';
import { COURSE } from '../constants/course.constants';

@Injectable()
export class CoursesService {
  constructor(
    private readonly coursesRepository: CoursesRepository,
    @InjectSentry() private readonly sentryService: SentryService,
  ) {}

  async getAllCourses(paginationOptionsDto: PaginationOptionsDto) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Course Service',
        level: 'debug',
        message: 'Getting All Courses',
        data: paginationOptionsDto,
      });
      return await this.coursesRepository.getAllCourses(paginationOptionsDto);
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async createCourse(createCourseDto: CreateCourseDto, user_id: string) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Course Service',
        level: 'debug',
        message: 'Create Course',
        data: {
          ...createCourseDto,
        },
      });

      const user = await this.coursesRepository.findUserById(user_id);
      if (!user) {
        throw new NotFoundException(`User with user_id ${user_id} couldn't be found in DB`);
      }
      return await this.coursesRepository.createCourseContent(createCourseDto, user_id);
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async getCourseDetails(course_id: string, user_id: string) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Course Service',
        level: 'debug',
        message: 'Get Course Details',
        data: {
          user_id,
          course_id,
        },
      });
      const course = await this.coursesRepository.getCourseDetails(course_id);
      if (!course) {
        throw new NotFoundException(`Course with course_id ${course_id} couldn't be found`);
      }
      return course;
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async updateCourse(updateCourseDto: UpdateCourseDto, course_id: string, user_id: string, roles: string[]) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Course Service',
        level: 'debug',
        message: 'Update Course',
        data: {
          user_id,
          course_id,
          ...updateCourseDto,
        },
      });
      const course = await this.coursesRepository.findCourseById(course_id);
      if (!course) {
        throw new NotFoundException(`Course with course_id ${course_id} couldn't be found`);
      }
      if (!(roles.includes(UserTypes.ADMIN) || course.author_id === user_id)) {
        throw new ForbiddenException(`User with user_id ${user_id} not allowed to perform the operation`);
      }
      await this.coursesRepository.updateCourseContent(updateCourseDto, course_id);
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async deleteCourse(course_id: string, { deleted }: DeleteCourseDto, roles: string[]) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Course Service',
        level: 'debug',
        message: 'Delete Course',
        data: {
          course_id,
          deleted,
        },
      });
      if (!roles.includes(UserTypes.ADMIN)) {
        throw new ForbiddenException('User not allowed to perform the operation');
      }
      const course = await this.coursesRepository.findCourseById(course_id);
      if (!course) {
        throw new NotFoundException(`Course with course_id ${course_id} couldn't be found`);
      }
      await this.coursesRepository.updateCourseDeleted(course_id, deleted);
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async hideCourse(course_id: string, { should_hide }: UpdateCourseHideDto, roles: string[]) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Course Service',
        level: 'debug',
        message: 'Hide Course',
        data: {
          course_id,
          hidden: should_hide,
        },
      });
      if (!roles.includes(UserTypes.ADMIN)) {
        throw new ForbiddenException('User not allowed to perform the operation');
      }
      const course = await this.coursesRepository.findCourseById(course_id);
      if (!course) {
        throw new NotFoundException(`Course with course_id ${course_id} couldn't be found`);
      }
      await this.coursesRepository.updateCourseHidden(course_id, should_hide);
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async getCourseRatings(course_id: string) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Course Service',
        level: 'debug',
        message: 'Get Course Rating',
        data: {
          course_id,
        },
      });
      return await this.coursesRepository.getRatings(course_id);
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async createCourseRating(createCourseRatingDto: CreateCourseRatingDto, user_id: string) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Course Service',
        level: 'debug',
        message: 'Create Course Rating',
        data: {
          ...createCourseRatingDto,
          user_id,
        },
      });
      const { course_id } = createCourseRatingDto;
      const courseEnrolment = await this.coursesRepository.findEnrolmentByUserAndCourse(user_id, course_id);
      if (!courseEnrolment) {
        throw new NotFoundException(`Course enrolment with course_id ${course_id} couldn't be found`);
      }
      const existingRating = await this.coursesRepository.findRatingByUserAndCourse(user_id, course_id);
      if (existingRating) {
        throw new ConflictException(`User has already rated course ${course_id}`);
      }
      return await this.coursesRepository.createRatingContent(createCourseRatingDto, user_id);
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async createCourseEnrolment(createCourseEnrolmentDto: CreateCourseEnrolmentDto, user_id: string) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Course Service',
        level: 'debug',
        message: 'Create Course Enrolment',
        data: {
          user_id,
          ...createCourseEnrolmentDto,
        },
      });
      const { course_id } = createCourseEnrolmentDto;
      const user = await this.coursesRepository.findUserById(user_id);
      if (!user) {
        throw new NotFoundException(`User with user_id ${user_id} couldn't be found in DB`);
      }
      const course = await this.coursesRepository.findCourseById(course_id);
      if (!course) {
        throw new NotFoundException(`Course with course_id ${course_id} couldn't be found`);
      }
      const existingEnrolment = await this.coursesRepository.findEnrolmentByUserAndCourse(user_id, course_id);
      if (existingEnrolment) {
        throw new ConflictException(`User is already enrolled in course ${course_id}`);
      }
      return await this.coursesRepository.createEnrolmentContent(course_id, user_id);
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async updateCourseEnrolment(updateCourseEnrolmentDto: UpdateCourseEnrolmentDto, user_id: string) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Course Service',
        level: 'debug',
        message: 'Update Course Enrolment',
        data: {
          user_id,
          ...updateCourseEnrolmentDto,
        },
      });
      const { course_id } = updateCourseEnrolmentDto;
      const user = await this.coursesRepository.findUserById(user_id);
      if (!user) {
        throw new NotFoundException(`User with user_id ${user_id} couldn't be found in DB`);
      }
      const course = await this.coursesRepository.findCourseById(course_id);
      if (!course) {
        throw new NotFoundException(`Course with course_id ${course_id} couldn't be found`);
      }
      const courseEnrolment = await this.coursesRepository.findEnrolmentByUserAndCourse(user_id, course_id);
      if (!courseEnrolment) {
        throw new NotFoundException(`Course enrolment with course_id ${course_id} couldn't be found`);
      }
      await this.coursesRepository.updateEnrolmentStatus(updateCourseEnrolmentDto, user_id);
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async getEnrolledCourses(user_id: string) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Course Service',
        level: 'debug',
        message: 'Getting Enrolled Courses',
        data: {
          user_id,
        },
      });
      return await this.coursesRepository.getAllEnrolledCourses(user_id);
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
    }
  }

  async getUserCreatedCourses(getUserCoursesDto: GetUserCoursesDto, user_id: string) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Course Service',
        level: 'debug',
        message: 'Getting User Created Courses',
        data: {
          user_id,
          ...getUserCoursesDto,
        },
      });
      return await this.coursesRepository.getAllAuthorCourses(getUserCoursesDto, user_id);
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async getUserNotEnrolledCourses(user_id: string) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Course Service',
        level: 'debug',
        message: 'Getting User Created Courses',
        data: {
          user_id,
        },
      });
      return await this.coursesRepository.getUserNotEnrolledCourses(user_id);
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async syncPlatformCourses(syncPlatformCoursesDto: SyncPlatformCoursesDto, user_id: string) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Course Service',
        level: 'debug',
        message: 'Sync Platform Courses',
        data: {
          user_id,
          ...syncPlatformCoursesDto,
        },
      });
      const platformCourses = await this.coursesRepository.getPlatformCourses(syncPlatformCoursesDto.platform);
      const results = await Promise.allSettled(
        platformCourses.map(async (course) => {
          const existingEnrolment = await this.coursesRepository.findEnrolmentByUserAndCourse(user_id, course.id);
          if (existingEnrolment) {
            return {
              skipped: true,
              course_id: course.id,
              reason: COURSE.SYNC_RESULTS.REASON_ALREADY_ENROLLED,
            };
          }
          await this.coursesRepository.createEnrolmentContent(course.id, user_id);
          return { success: true, course_id: course.id };
        }),
      );

      const processed = results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        }
        return {
          failed: true,
          course_id: platformCourses[index]?.id,
          error: result.reason?.message || 'Unknown error',
        };
      });

      const successKey = COURSE.SYNC_RESULTS.KEY_SUCCESS;
      const skippedKey = COURSE.SYNC_RESULTS.KEY_SKIPPED;
      const failedKey = COURSE.SYNC_RESULTS.KEY_FAILED;

      return {
        total: platformCourses.length,
        successful: processed.filter((p) => successKey in p && (p as any).success).length,
        skipped: processed.filter((p) => skippedKey in p && (p as any).skipped).length,
        failed: processed.filter((p) => failedKey in p && (p as any).failed).length,
        results: processed,
      };
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async getUserCreatedTutorials(user_id: string) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Course Service',
        level: 'debug',
        message: 'Getting User Created Courses',
        data: {
          user_id,
        },
      });
      return (await this.coursesRepository.getUserCreatedTutorials(user_id)).map(({ id, name }) => ({ id, name }));
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }
}
