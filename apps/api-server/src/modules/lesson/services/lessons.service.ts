import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { UserTypes } from '../../user/domain/user-types.enum';
import { CreateLessonCompletionDto } from '../dto/create-lesson-completion.dto';
import { UpsertLessonsDto } from '../dto/upsert-lessons.dto';
import { LessonsRepository } from '../repositories/lessons.repository';
import { DeleteLessonDto } from '../dto/delete-lesson.dto';

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
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async upsertLessons({ course_id, lessons }: UpsertLessonsDto, user_id: string, roles: string[]) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Lesson Service',
        level: 'debug',
        message: 'Update Lessons',
        data: {
          course_id,
          lessons,
        },
      });

      const course = await this.lessonsRepository.checkForeignKeyCourseIdExist(course_id);
      if (!course) {
        throw new NotFoundException(`Course with course_id ${course_id} couldn't be found`);
      }
      if (!(roles.includes(UserTypes.ADMIN) || course.author_id === user_id)) {
        throw new ForbiddenException(`User with user_id ${user_id} not allowed to perform the operation`);
      }
      await this.lessonsRepository.upsertCourseLessons({ course_id, lessons });
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
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
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async deleteCourseLesson({ course_id, lesson_id }: DeleteLessonDto) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Course Service',
        level: 'debug',
        message: 'Delete Course',
        data: {
          course_id,
          lesson_id,
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
      await this.lessonsRepository.deleteCourseLesson({ course_id, lesson_id });
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }
}
