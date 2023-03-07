import { Injectable } from '@nestjs/common';
import { AppDataSource } from '../../../../ormconfig';
import { CourseEnrolment } from '../../course/entities/course-enrolment.enitiy';
import { CourseRating } from '../../course/entities/course-rating.entity';
import { Course } from '../../course/entities/course.entity';
import { CreateLessonCompletionDto } from '../dto/create-lesson-completion.dto';
import { CreateLessonRatingDto } from '../dto/create-lesson-rating.dto';
import { CreateLessonDto } from '../dto/create-lesson.dto';
import { UpdateLessonDto } from '../dto/update-lesson.dto';
import { LessonCompletion } from '../entities/lesson-completion.entity';
import { Lesson } from '../entities/lesson.entity';

@Injectable()
export class LessonsRepository {
  private readonly ormLesson = AppDataSource.getRepository(Lesson);

  private readonly ormLessonCompletion = AppDataSource.getRepository(LessonCompletion);

  private readonly ormCourseRating = AppDataSource.getRepository(CourseRating);

  private readonly ormCourse = AppDataSource.getRepository(Course);

  private readonly ormCourseEnrolment = AppDataSource.getRepository(CourseEnrolment);

  async getCourseLessons(course_id: string) {
    return this.ormLesson.find({
      where: {
        course_id,
      },
    });
  }

  async getLessonRatings(course_id: string, lesson_id: string) {
    return this.ormCourseRating.find({
      where: {
        course_id,
        lesson_id,
      },
    });
  }

  async createCourseLessons({ lessons, course_id }: CreateLessonDto) {
    await this.ormLesson
      .createQueryBuilder()
      .insert()
      .into(Lesson)
      .values([
        ...lessons.map((lesson) => ({
          title: lesson.title,
          content: lesson.content,
          url: lesson.url,
          course_id,
        })),
      ])
      .orUpdate(['title', 'content', 'url', 'course_id'], ['title', 'content', 'url'], {
        skipUpdateIfNoValuesChanged: true,
      })
      .execute();
  }

  async createLessonRating({ lesson_id, course_id, rating, review }: CreateLessonRatingDto) {
    await this.ormLesson
      .createQueryBuilder()
      .insert()
      .into(CourseRating)
      .values({
        lesson_id,
        course_id,
        rating,
        review,
      })
      .orUpdate(['rating', 'lesson_id', 'course_id'], ['review'], {
        skipUpdateIfNoValuesChanged: true,
      })
      .execute();
  }

  async createLessonCompletion({ lesson_id, course_id }: CreateLessonCompletionDto, user_id: string) {
    await this.ormLessonCompletion
      .createQueryBuilder()
      .insert()
      .into(LessonCompletion)
      .values({
        lesson_id,
        course_id,
        user_id,
      })
      .orUpdate(['user_id', 'lesson_id', 'course_id'], [], {
        skipUpdateIfNoValuesChanged: true,
      })
      .execute();
  }

  async updateCourseLessons({ lesson_id, course_id, title, content, url }: UpdateLessonDto) {
    await this.ormLesson.update(
      {
        id: lesson_id,
        course_id,
      },
      {
        title,
        content,
        url,
      },
    );
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
}
