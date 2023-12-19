import { Injectable } from '@nestjs/common';
import { AppDataSource } from '../../../../ormconfig';
import { Course } from '../entities/course.entity';
import { CourseEnrolment } from '../entities/course-enrolment.enitiy';
import { CourseRating } from '../entities/course-rating.entity';
import { User } from '../../user/entities/user.entity';
import { UpdateCourseDto } from '../dto/update-course.dto';
import { CreateCourseDto } from '../dto/create-course.dto';
import { CreateCourseRatingDto } from '../dto/create-course-rating.dto';
import { UpdateCourseEnrolmentDto } from '../dto/update-course-enrolment.dto';
import { In, Not } from 'typeorm';
import { PageOptionsDto } from '../dto/page-options.dto';
import { PageMetaDto } from '../dto/page-meta.dto';
import { PageDto } from '../dto/page.dto';

@Injectable()
export class CoursesRepository {
  private readonly ormCourse = AppDataSource.getRepository(Course);

  private readonly ormCourseEnrolment = AppDataSource.getRepository(CourseEnrolment);

  private readonly ormCourseRating = AppDataSource.getRepository(CourseRating);

  private readonly ormUser = AppDataSource.getRepository(User);

  async getAllAuthorCourses(user_id: string): Promise<Course[]> {
    return this.ormCourse.find({
      where: {
        author: {
          id: user_id,
        },
      },
    });
  }

  async getAllEnrolledCourses(user_id: string): Promise<Course[]> {
    const courseEnrollments = await this.ormCourseEnrolment.find({
      where: {
        user: {
          id: user_id,
        },
      },
    });

    return Promise.all(
      courseEnrollments.map(async (enrolment: CourseEnrolment) => {
        const courseFound = await this.ormCourse.findOne({
          where: {
            id: enrolment.course.id,
          },
        });
        if (courseFound) return courseFound;
      }),
    );
  }

  async getRatings(course_id: string): Promise<CourseRating[]> {
    return this.ormCourseRating.find({
      where: {
        course_id,
      },
    });
  }

  async createCourseContent({ name, description }: CreateCourseDto, author_id: string) {
    await this.ormCourse
      .createQueryBuilder()
      .insert()
      .into(Course)
      .values({
        name,
        description,
        author_id,
      })
      .execute();
  }

  async createRatingContent({ review, rating, course_id }: CreateCourseRatingDto, user_id: string) {
    await this.ormCourseRating
      .createQueryBuilder()
      .insert()
      .into(CourseRating)
      .values({
        rating,
        course_id,
        user_id,
        review,
      })
      .execute();
  }

  async createEnrolmentContent(course_id: string, user_id: string) {
    await this.ormCourseEnrolment
      .createQueryBuilder()
      .insert()
      .into(CourseEnrolment)
      .values({
        course_id,
        user_id,
      })
      .execute();
  }

  async updateCourseContent({ name, description }: UpdateCourseDto, course_id: string) {
    await this.ormCourse.update(
      {
        id: course_id,
      },
      {
        name,
        description,
      },
    );
  }

  async updateCourseDeleted(course_id: string, deleted: boolean) {
    await this.ormCourse.update(
      {
        id: course_id,
      },
      {
        deleted,
      },
    );
  }

  async updateCourseHidden(course_id: string, is_hidden: boolean) {
    await this.ormCourse.update(
      {
        id: course_id,
      },
      {
        is_hidden,
      },
    );
  }

  async updateEnrolmentStatus({ course_id, finished }: UpdateCourseEnrolmentDto) {
    await this.ormCourseEnrolment.update(
      {
        course_id,
      },
      {
        finished,
      },
    );
  }

  async checkForeignKeyUserIdExist(user_id: string) {
    return this.ormUser.findOne({
      where: {
        id: user_id,
      },
    });
  }

  async checkForeignKeyCourseIdExist(course_id: string, user_id?: string) {
    return this.ormCourse.findOne({
      where: {
        id: course_id,
        author_id: user_id,
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

  async getAllCourses(pageOptionsDto: PageOptionsDto) {
    const queryBuilder = this.ormCourse.createQueryBuilder('courses');
    queryBuilder
      .orderBy('courses.created_at', pageOptionsDto.order)
      .skip(pageOptionsDto.skip)
      .take(pageOptionsDto.take);

    const itemCount = await queryBuilder.getCount();
    const { entities } = await queryBuilder.getRawAndEntities();
    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });
    return new PageDto(entities, pageMetaDto);
  }

  async getUserNotEnrolledCourses(user_id: string): Promise<Course[]> {
    const courseEnrollments = await this.ormCourseEnrolment.find({
      where: {
        user: {
          id: user_id,
          auth0_id: Not(user_id),
        },
      },
    });
    const enrolledCoursesIds = courseEnrollments.map((enrolment) => enrolment.id);
    return await this.ormCourse.find({ where: { id: Not(In(enrolledCoursesIds)) } });
  }
}
