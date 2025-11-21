import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
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
import { GetUserCoursesDto } from '../dto/get-user-courses.dto';
import { Lesson } from '../../lesson/entities/lesson.entity';
import { LessonCompletion } from '../../lesson/entities/lesson-completion.entity';
import { Platform } from '../../../shared/domain/platform.enum';

@Injectable()
export class CoursesRepository extends BaseRepository<Course> {
  private readonly ormCourseEnrolment: Repository<CourseEnrolment>;

  private readonly ormCourseRating: Repository<CourseRating>;

  private readonly ormUser: Repository<User>;

  private readonly ormLessons: Repository<Lesson>;

  private readonly ormLessonCompletions: Repository<LessonCompletion>;

  constructor(private readonly dataSource: DataSource) {
    super(dataSource, Course);
    this.ormCourseEnrolment = this.dataSource.getRepository(CourseEnrolment);
    this.ormCourseRating = this.dataSource.getRepository(CourseRating);
    this.ormUser = this.dataSource.getRepository(User);
    this.ormLessons = this.dataSource.getRepository(Lesson);
    this.ormLessonCompletions = this.dataSource.getRepository(LessonCompletion);
  }

  async getAllAuthorCourses({ hidden, deleted }: GetUserCoursesDto, user_id: string): Promise<Course[]> {
    return this.orm.find({
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
    // Use query builder for better performance with joins
    return this.orm
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.ratings', 'rating', 'rating.user_id = :userId', { userId: user_id })
      .leftJoinAndSelect('course.lessons', 'lesson', 'lesson.deleted = false')
      .leftJoinAndSelect('course.lessonCompletions', 'lessonCompletion', 'lessonCompletion.user_id = :userId', {
        userId: user_id,
      })
      .leftJoinAndSelect('course.enrollments', 'enrollment', 'enrollment.user_id = :userId', { userId: user_id })
      .innerJoin('course_enrolments', 'ce', 'ce.course_id = course.id AND ce.user_id = :userId', { userId: user_id })
      .where('course.deleted = false')
      .andWhere('course.is_hidden = false')
      .getMany();
  }

  async getRatings(course_id: string): Promise<CourseRating[]> {
    return this.ormCourseRating.find({
      where: {
        course_id,
      },
    });
  }

  async createCourseContent(createCourseDto: CreateCourseDto, author_id: string): Promise<Course> {
    const newCourse = new Course({ ...createCourseDto, author_id });
    return this.orm.save(newCourse);
  }

  async createRatingContent(createCourseRatingDto: CreateCourseRatingDto, user_id: string): Promise<CourseRating> {
    const newRating = new CourseRating({ ...createCourseRatingDto, user_id });
    return this.ormCourseRating.save(newRating);
  }

  async createEnrolmentContent(course_id: string, user_id: string): Promise<CourseEnrolment> {
    const newEnrolment = new CourseEnrolment({ course_id, user_id });
    return this.ormCourseEnrolment.save(newEnrolment);
  }

  async updateCourseContent({ name, description }: UpdateCourseDto, course_id: string): Promise<void> {
    await this.orm.update(
      {
        id: course_id,
      },
      {
        name,
        description,
      },
    );
  }

  async updateCourseDeleted(course_id: string, deleted: boolean): Promise<void> {
    await this.orm.update(
      {
        id: course_id,
      },
      {
        deleted,
      },
    );
  }

  async updateCourseHidden(course_id: string, is_hidden: boolean): Promise<void> {
    await this.orm.update(
      {
        id: course_id,
      },
      {
        is_hidden,
      },
    );
  }

  async updateEnrolmentStatus({ course_id, finished }: UpdateCourseEnrolmentDto, user_id: string): Promise<void> {
    await this.ormCourseEnrolment.update(
      {
        course_id,
        user_id,
      },
      {
        finished,
      },
    );
  }

  async getCourseDetails(course_id: string): Promise<Course | null> {
    return this.orm
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.ratings', 'rating')
      .leftJoinAndSelect('course.lessons', 'lesson', 'lesson.deleted = false')
      .leftJoinAndSelect('course.lessonCompletions', 'lessonCompletion')
      .where('course.id = :courseId', { courseId: course_id })
      .andWhere('course.deleted = false')
      .getOne();
  }

  async getUserCreatedTutorials(user_id: string): Promise<Course[]> {
    return this.orm.find({
      where: {
        author_id: user_id,
        deleted: false,
        is_hidden: false,
      },
    });
  }

  async findUserById(user_id: string): Promise<User | null> {
    return this.ormUser.findOne({
      where: {
        id: user_id,
      },
    });
  }

  async findCourseById(course_id: string): Promise<Course | null> {
    return this.orm.findOne({
      where: {
        id: course_id,
      },
    });
  }

  async findEnrolmentByUserAndCourse(user_id: string, course_id: string): Promise<CourseEnrolment | null> {
    return this.ormCourseEnrolment.findOne({
      where: {
        course_id,
        user_id,
      },
    });
  }

  async findRatingByUserAndCourse(user_id: string, course_id: string): Promise<CourseRating | null> {
    return this.ormCourseRating.findOne({
      where: {
        course_id,
        user_id,
      },
    });
  }

  async getAllCourses(paginationOptionsDto: PaginationOptionsDto): Promise<PaginationDto<Course>> {
    const [entities, totalCount] = await Promise.all([
      this.orm.find({
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
      }),
      this.orm.count(),
    ]);
    const paginationMetaDto = new PaginationMetaDto({ itemCount: totalCount, paginationOptionsDto });
    return new PaginationDto(entities, paginationMetaDto);
  }

  async getUserNotEnrolledCourses(user_id: string): Promise<Course[]> {
    return this.orm
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.ratings', 'rating')
      .where('course.deleted = false')
      .andWhere('course.is_hidden = false')
      .andWhere('course.author_id != :userId', { userId: user_id })
      .andWhere(
        `course.id NOT IN (
        SELECT ce.course_id FROM course_enrolments ce WHERE ce.user_id = :userId
      )`,
        { userId: user_id },
      )
      .getMany();
  }

  async getPlatformCourses(platform: Platform): Promise<Course[]> {
    return this.orm.find({
      where: {
        platform,
        deleted: false,
        is_hidden: false,
      },
    });
  }
}
