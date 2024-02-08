import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user/entities/user.entity';
import { CoursesController } from './controllers/courses.controller';
import { CourseEnrolment } from './entities/course-enrolment.entity';
import { CourseRating } from './entities/course-rating.entity';
import { Course } from './entities/course.entity';
import { LessonCompletion } from '../lesson/entities/lesson-completion.entity';
import { Lesson } from '../lesson/entities/lesson.entity';
import { CoursesRepository } from './repositories/courses.repository';
import { CoursesService } from './services/courses.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Course, Lesson, CourseEnrolment, CourseRating, LessonCompletion])],
  controllers: [CoursesController],
  providers: [CoursesService, CoursesRepository],
})
export class CoursesModule {}
