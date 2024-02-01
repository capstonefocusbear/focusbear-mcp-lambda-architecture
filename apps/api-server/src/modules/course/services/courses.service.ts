import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
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
import { PaginationOptionsDto } from '../dto/pagination/pagination-options.dto';

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

      const user = await this.coursesRepository.checkForeignKeyUserIdExist(user_id);
      if (!user) {
        throw new NotFoundException(`User with user_id ${user_id} couldn't be found in DB`);
      }
      await this.coursesRepository.createCourseContent(createCourseDto, user_id);
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
      const course = await this.coursesRepository.checkForeignKeyCourseIdExist(course_id);
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
      const course = await this.coursesRepository.checkForeignKeyCourseIdExist(course_id);
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
      const course = await this.coursesRepository.checkForeignKeyCourseIdExist(course_id);
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
      const course = await this.coursesRepository.checkForeignKeyCourseIdExist(course_id);
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
      const courseEnrolment = await this.coursesRepository.checkUserCourseEnrolment(user_id, course_id);
      if (!courseEnrolment) {
        throw new NotFoundException(`Course enrolment with course_id ${course_id} couldn't be found`);
      }
      await this.coursesRepository.createRatingContent(createCourseRatingDto, user_id);
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
      const user = await this.coursesRepository.checkForeignKeyUserIdExist(user_id);
      if (!user) {
        throw new NotFoundException(`User with user_id ${user_id} couldn't be found in DB`);
      }
      const course = await this.coursesRepository.checkForeignKeyCourseIdExist(course_id);
      if (!course) {
        throw new NotFoundException(`Course with course_id ${course_id} couldn't be found`);
      }
      await this.coursesRepository.createEnrolmentContent(course_id, user_id);
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
      const user = await this.coursesRepository.checkForeignKeyUserIdExist(user_id);
      if (!user) {
        throw new NotFoundException(`User with user_id ${user_id} couldn't be found in DB`);
      }
      const course = await this.coursesRepository.checkForeignKeyCourseIdExist(course_id);
      if (!course) {
        throw new NotFoundException(`Course with course_id ${course_id} couldn't be found`);
      }
      const courseEnrolment = await this.coursesRepository.checkUserCourseEnrolment(user_id, course_id);
      if (!courseEnrolment) {
        throw new NotFoundException(`Course enrolment with course_id ${course_id} couldn't be found`);
      }
      await this.coursesRepository.updateEnrolmentStatus(updateCourseEnrolmentDto);
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

  async getUserCreatedCourses(user_id: string) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Course Service',
        level: 'debug',
        message: 'Getting User Created Courses',
        data: {
          user_id,
        },
      });
      return await this.coursesRepository.getAllAuthorCourses(user_id);
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
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
    }
  }
}
