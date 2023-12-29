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
      where: { course_id, deleted: false },
    });
  }

  async upsertCourseLessons({ lessons, course_id }: UpsertLessonsDto) {
    await this.ormLesson
      .createQueryBuilder()
      .insert()
      .into(Lesson)
      .values(lessons.map((lesson) => ({ ...lesson, course_id })))
      .orUpdate(['title', 'content', 'url'], ['id'])
      .execute();
  }

  async createLessonCompletion(createLessonCompletionDto: CreateLessonCompletionDto, user_id: string) {
    const newLessonCompletion = new LessonCompletion({ ...createLessonCompletionDto, user_id });
    await this.ormLessonCompletion.save(newLessonCompletion);
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
    await this.ormLesson.update(
      {
        id: lesson_id,
        course_id,
      },
      {
        deleted: true,
      },
    );
  }
}
