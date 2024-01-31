import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { UserTypes } from '../../user/domain/user-types.enum';
import { CreateLessonCompletionDto } from '../dto/create-lesson-completion.dto';
import { CreateLessonRatingDto } from '../dto/create-lesson-rating.dto';
import { CreateLessonDto } from '../dto/create-lesson.dto';
import { UpdateLessonDto } from '../dto/update-lesson.dto';
import { LessonsRepository } from '../repositories/lessons.repository';

@Injectable()
export class LessonsService {
  constructor(
    private readonly lessonsRepository: LessonsRepository,
    @InjectSentry() private readonly sentryService: SentryService,
  ) {}

  async getLessons(course_id: string) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Lesson Service',
        level: 'debug',
        message: 'Getting All Course Lessons',
        data: {
          course_id,
        },
      });
      return await this.lessonsRepository.getCourseLessons(course_id);
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
  }

  async createLessons({ course_id, lessons }: CreateLessonDto) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Lesson Service',
        level: 'debug',
        message: 'Create Lessons',
        data: {
          course_id,
          lessons,
        },
      });
      const course = await this.lessonsRepository.checkForeignKeyCourseIdExist(course_id);
      if (!course) {
        throw new NotFoundException(`Course with course_id ${course_id} couldn't be found`);
      }
      await this.lessonsRepository.createCourseLessons({ course_id, lessons });
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
  }

  async updateLessons(
    { course_id, lesson_id, title, content, url }: UpdateLessonDto,
    user_id: string,
    roles: string[],
  ) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Lesson Service',
        level: 'debug',
        message: 'Update Lessons',
        data: {
          course_id,
          lesson_id,
          title,
          content,
          url,
        },
      });

      const course = await this.lessonsRepository.checkForeignKeyCourseIdExist(course_id);
      if (!course) {
        throw new NotFoundException(`Course with course_id ${course_id} couldn't be found`);
      }
      const lesson = await this.lessonsRepository.checkForeignKeyLessonIdExist(lesson_id);
      if (!lesson) {
        throw new NotFoundException(`Lesson with lesson_id ${lesson_id} couldn't be found`);
      }

      if (!(roles.includes(UserTypes.ADMIN) || course.author_id === user_id)) {
        throw new ForbiddenException(`User with user_id ${user_id} not allowed to perform the operation`);
      }
      await this.lessonsRepository.updateCourseLessons({ course_id, lesson_id, title, content, url });
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
  }

  async getLessonRatings(course_id: string, lesson_id: string) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Lesson Service',
        level: 'debug',
        message: 'Get Lesson Ratings',
        data: {
          course_id,
        },
      });
      return await this.lessonsRepository.getLessonRatings(course_id, lesson_id);
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
  }

  async createLessonRating({ course_id, lesson_id, rating, review }: CreateLessonRatingDto, user_id: string) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Lesson Service',
        level: 'debug',
        message: 'Create Lesson Rating',
        data: {
          course_id,
          lesson_id,
          rating,
          review,
        },
      });
      const courseEnrolment = await this.lessonsRepository.checkUserCourseEnrolment(user_id, course_id);
      if (!courseEnrolment) {
        throw new NotFoundException(`Course enrolment with course_id ${course_id} couldn't be found`);
      }
      const lesson = await this.lessonsRepository.checkForeignKeyLessonIdExist(lesson_id);
      if (!lesson) {
        throw new NotFoundException(`Lesson with lesson_id ${lesson_id} couldn't be found`);
      }
      await this.lessonsRepository.createLessonRating({ course_id, lesson_id, rating, review });
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
  }

  async createCompletedLesson({ course_id, lesson_id, status }: CreateLessonCompletionDto, user_id: string) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Lesson Service',
        level: 'debug',
        message: 'Create Lesson Completion',
        data: {
          course_id,
          lesson_id,
          status,
          user_id,
        },
      });

      const course = await this.lessonsRepository.checkForeignKeyCourseIdExist(course_id);
      if (!course) {
        throw new NotFoundException(`Course with course_id ${course_id} couldn't be found`);
      }
      const lesson = await this.lessonsRepository.checkForeignKeyLessonIdExist(lesson_id);
      if (!lesson) {
        throw new NotFoundException(`Lesson with lesson_id ${lesson_id} couldn't be found`);
      }
      await this.lessonsRepository.createLessonCompletion({ course_id, lesson_id, status }, user_id);
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
  }
}
