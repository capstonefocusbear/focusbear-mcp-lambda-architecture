import { Injectable } from '@nestjs/common';
import { AppDataSource } from '../../../../ormconfig';
import { CourseEnrolment } from '../../course/entities/course-enrolment.enitiy';
import { Course } from '../../course/entities/course.entity';
import { CreateLessonCompletionDto } from '../dto/create-lesson-completion.dto';
import { LessonCompletion } from '../entities/lesson-completion.entity';
import { Lesson } from '../entities/lesson.entity';
import { UpsertLessonsDto } from '../dto/upsert-lessons.dto';
import { DeleteLessonDto } from '../dto/delete-lesson.dto';

@Injectable()
export class LessonsRepository {
  private readonly ormLesson = AppDataSource.getRepository(Lesson);

  private readonly ormLessonCompletion = AppDataSource.getRepository(LessonCompletion);

  private readonly ormCourse = AppDataSource.getRepository(Course);

  private readonly ormCourseEnrolment = AppDataSource.getRepository(CourseEnrolment);

  async getCourseLessons(course_id: string) {
    return this.ormLesson.find({
      where: { course_id },
    });
  }

  async upsertCourseLessons({ lessons, course_id }: UpsertLessonsDto) {
    await Promise.allSettled(
      lessons.map(
        async (lesson) =>
          await this.ormLesson
            .createQueryBuilder()
            .insert()
            .into(Lesson)
            .values({ ...lesson, course_id })
            .orUpdate(['title', 'content', 'url'], ['id'])
            .execute(),
      ),
    );
  }

  async createLessonCompletion({ lesson_id, course_id }: CreateLessonCompletionDto, user_id: string) {
    await this.ormLessonCompletion
      .createQueryBuilder()
      .insert()
      .into(LessonCompletion)
      .values({
        course_id,
        lesson_id,
        user_id,
      })
      .execute();
  }

  async checkForeignKeyCourseIdExist(course_id: string) {
    return this.ormCourse.findOne({
      where: {
        id: course_id,
      },
    });
  }

  async checkForeignKeyLessonIdExist(lesson_id: string, course_id?: string) {
    return this.ormLesson.findOne({
      where: {
        id: lesson_id,
        course_id,
      },
    });
  }

  async checkUserCourseEnrolment(user_id: string, course_id: string) {
    return this.ormCourseEnrolment.findOne({
      where: {
        course_id,
        user_id,
      },
    });
  }

  async deleteCourseLesson({ course_id, lesson_id }: DeleteLessonDto) {
    await this.ormLesson
      .createQueryBuilder()
      .delete()
      .where('id = :id', { id: lesson_id })
      .andWhere('course_id = :course_id', { course_id })
      .execute();
  }
}
