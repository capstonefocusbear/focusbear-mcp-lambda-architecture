import { Body, Controller, Get, Param, Post, Patch, Delete, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { Passport } from '../../auth/domain/passport.model';
import { CoursesService } from '../services/courses.service';
import { IsAuth } from '../../auth/guards/is-auth/is-auth.guard';
import { IsAdmin } from '../../auth/guards/is-admin/is-admin.guard';
import { AuthContext } from '../../../shared/decorators/passport.decorator';
import { CreateCourseDto } from '../dto/create-course.dto';
import { UpdateCourseDto } from '../dto/update-course.dto';
import { CreateCourseRatingDto } from '../dto/create-course-rating.dto';
import { CreateCourseEnrolmentDto } from '../dto/create-course-enrolment.dto';
import { UpdateCourseEnrolmentDto } from '../dto/update-course-enrolment.dto';
import { GetUserRoles } from '../../../shared/decorators/get-user-roles.decorator';

@Controller('course')
@UseGuards(IsAuth)
@ApiTags('course')
@ApiSecurity('Auth0AccessToken')
export class CoursesController {
  constructor(private coursesService: CoursesService) {}

  @Get()
  getAllCourses(@AuthContext() { user }: Passport) {
    return this.coursesService.getAllCourses(user.id);
  }

  @Post()
  createCourse(@Body() createCourseDto: CreateCourseDto, @AuthContext() { user }: Passport) {
    this.coursesService.createCourse(createCourseDto, user.id);
  }

  @Patch(':course_id')
  updateCourse(
    @Body() updateCourseDto: UpdateCourseDto,
    @Param('course_id') course_id: string,
    @AuthContext() { user }: Passport,
    @GetUserRoles() roles: string[],
  ) {
    return this.coursesService.updateCourse(updateCourseDto, course_id, user.id, roles);
  }

  @UseGuards(IsAdmin)
  @Delete(':course_id')
  deleteCourse(
    @Body('deleted') deleted: boolean,
    @Param('course_id') course_id: string,
    @GetUserRoles() roles: string[],
  ) {
    return this.coursesService.deleteCourse(course_id, deleted, roles);
  }

  @UseGuards(IsAdmin)
  @Patch(':course_id/hide')
  hideCourse(@Body('hidden') hidden: boolean, @Param('course_id') course_id: string, @GetUserRoles() roles: string[]) {
    return this.coursesService.hideCourse(course_id, hidden, roles);
  }

  @Get(':course_id/rating')
  getCourseRatings(@Param('course_id') course_id: string) {
    return this.coursesService.getCourseRatings(course_id);
  }

  @Post('rating')
  createCourseRating(@Body() createCourseRatingDto: CreateCourseRatingDto, @AuthContext() { user }: Passport) {
    return this.coursesService.createCourseRating(createCourseRatingDto, user.id);
  }

  @Post('enrolment')
  createCourseEnrolment(@Body() createCourseEnrolmentDto: CreateCourseEnrolmentDto, @AuthContext() { user }: Passport) {
    return this.coursesService.createCourseEnrolment(createCourseEnrolmentDto, user.id);
  }

  @Patch('enrolment')
  updateCourseLessonCompletion(
    @Param() updateCourseEnrolmentDto: UpdateCourseEnrolmentDto,
    @AuthContext() { user }: Passport,
    @GetUserRoles() roles: string[],
  ) {
    return this.coursesService.updateCourseEnrolment(updateCourseEnrolmentDto, user.id, roles);
  }
}
