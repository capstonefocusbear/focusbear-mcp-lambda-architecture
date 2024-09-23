import { Injectable } from '@nestjs/common';
import { Equal, In, Not } from 'typeorm';
import { AppDataSource } from '../../../../ormconfig';
import { Course } from '../entities/course.entity';
import { CourseEnrolment } from '../entities/course-enrolment.entity';
import { CourseRating } from '../entities/course-rating.entity';
import { User } from '../../user/entities/user.entity';
import { UpdateCourseDto } from '../dto/update-course.dto';
import { CreateCourseDto } from '../dto/create-course.dto';
import { CreateCourseRatingDto } from '../dto/create-course-rating.dto';
import { UpdateCourseEnrolmentDto } from '../dto/update-course-enrolment.dto';
import { PaginationDto } from '../../../shared/pagination/index.dto';
import { PaginationMetaDto } from '../../../shared/pagination/pagination-meta.dto';
import { PaginationOptionsDto } from '../../../shared/pagination/pagination-options.dto';
import { CoursePlatform } from '../domain/course-platform.enum';
import { GetUserCoursesDto } from '../dto/get-user-courses.dto';
import { Lesson } from '../../lesson/entities/lesson.entity';
import { LessonCompletion } from '../../lesson/entities/lesson-completion.entity';

@Injectable()
export class CoursesRepository {
  private readonly ormCourse = AppDataSource.getRepository(Course);

  private readonly ormCourseEnrolment = AppDataSource.getRepository(CourseEnrolment);

  private readonly ormCourseRating = AppDataSource.getRepository(CourseRating);

  private readonly ormUser = AppDataSource.getRepository(User);

  private readonly ormLessons = AppDataSource.getRepository(Lesson);

  private readonly ormLessonCompletions = AppDataSource.getRepository(LessonCompletion);

  async getAllAuthorCourses({ hidden, deleted }: GetUserCoursesDto, user_id: string): Promise<Course[]> {
    return this.ormCourse.find({
      where: {
        author: {
          id: user_id,
        },
        is_hidden: hidden,
        deleted,
      },
      relations: ['ratings'],
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
    const enrolledCoursesIds = courseEnrollments.map((enrolment) => enrolment.course_id);
    const [courses, ratings, lessons, lessonCompletions, enrollments] = await Promise.all([
      this.ormCourse.find({
        where: { id: In(enrolledCoursesIds), deleted: false, is_hidden: false },
      }),
      this.ormCourseRating.find({ where: { course_id: In(enrolledCoursesIds) } }),
      this.ormLessons.find({ where: { course_id: In(enrolledCoursesIds) } }),
      this.ormLessonCompletions.find({ where: { course_id: In(enrolledCoursesIds) } }),
      this.ormCourseEnrolment.find({ where: { course_id: In(enrolledCoursesIds) } }),
    ]);

    const coursesWithRelations = courses.map((course) => ({
      ...course,
      ratings: ratings.filter((rating) => rating.course_id === course.id),
      lessons: lessons.filter((lesson) => lesson.course_id === course.id),
      lessonCompletions: lessonCompletions.filter((lessonCompletion) => lessonCompletion.course_id === course.id),
      enrollments: enrollments.filter((enrollment) => enrollment.course_id === course.id),
    }));

    return coursesWithRelations;
  }

  async getRatings(course_id: string): Promise<CourseRating[]> {
    return this.ormCourseRating.find({
      where: {
        course_id,
      },
    });
  }

  async createCourseContent(createCourseDto: CreateCourseDto, author_id: string) {
    const newCourse = new Course({ ...createCourseDto, author_id });
    await this.ormCourse.save(newCourse);
  }

  async createRatingContent(createCourseRatingDto: CreateCourseRatingDto, user_id: string) {
    const newRating = new CourseRating({ ...createCourseRatingDto, user_id });
    await this.ormCourseRating.save(newRating);
  }

  async createEnrolmentContent(course_id: string, user_id: string) {
    const newEnrolment = new CourseEnrolment({ course_id, user_id });
    await this.ormCourseEnrolment.save(newEnrolment);
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

  async getCourseDetails(course_id: string) {
    return this.ormCourse.findOne({
      where: {
        id: course_id,
        deleted: false,
        lessons: {
          deleted: false,
        },
      },
      relations: ['ratings', 'lessons', 'lessonCompletions'],
    });
  }

  async getUserCreatedTutorials(user_id: string) {
    return this.ormCourse.find({
      where: {
        author_id: user_id,
        deleted: false,
        is_hidden: false,
      },
    });
  }

  async checkForeignKeyUserIdExist(user_id: string) {
    return this.ormUser.findOne({
      where: {
        id: user_id,
      },
    });
  }

  async checkForeignKeyCourseIdExist(course_id: string) {
    return this.ormCourse.findOne({
      where: {
        id: course_id,
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

  async getAllCourses(paginationOptionsDto: PaginationOptionsDto) {
    const entities = await this.ormCourse.find({
      order: {
        created_at: paginationOptionsDto.order,
      },
      skip: paginationOptionsDto.skip,
      take: paginationOptionsDto.take,
      relations: {
        ratings: true,
        author: true,
      },
      select: {
        ratings: {
          rating: true,
          review: true,
          user_id: true,
          created_at: true,
        },
        author: {
          username: true,
        },
      },
    });
    const paginationMetaDto = new PaginationMetaDto({ itemCount: entities.length, paginationOptionsDto });
    return new PaginationDto(entities, paginationMetaDto);
  }

  async getUserNotEnrolledCourses(user_id: string): Promise<Course[]> {
    const courseEnrollments = await this.ormCourseEnrolment.find({
      where: {
        user: {
          id: user_id,
        },
      },
    });
    const enrolledCoursesIds = courseEnrollments.map((enrolment) => enrolment.course_id);
    return this.ormCourse.find({
      where: { id: Not(In(enrolledCoursesIds)), author_id: Not(Equal(user_id)), deleted: false, is_hidden: false },
      relations: ['ratings'],
    });
  }

  async getPlatformCourses(platform: CoursePlatform) {
    return this.ormCourse.find({
      where: {
        platform,
      },
    });
  }
}
