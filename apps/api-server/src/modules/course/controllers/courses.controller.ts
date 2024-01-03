import { Body, Controller, Get, Param, Post, Patch, Delete, UseGuards, Query } from '@nestjs/common';
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
import { UpdateCourseHideDto } from '../dto/update-course-hide.dto';
import { DeleteCourseDto } from '../dto/delete-course.dto';
import { PaginationDto } from '../dto/pagination';
import { Course } from '../entities/course.entity';
import { PaginationOptionsDto } from '../dto/pagination/pagination-options.dto';

@Controller('course')
@UseGuards(IsAuth)
@ApiTags('course')
@ApiSecurity('Auth0AccessToken')
export class CoursesController {
  constructor(private coursesService: CoursesService) {}

  @UseGuards(IsAdmin)
  @Get('admin')
  getAllCourses(@Query() paginationOptionsDto: PaginationOptionsDto): Promise<PaginationDto<Course>> {
    return this.coursesService.getAllCourses(paginationOptionsDto);
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
    @Body() deleteCourseDto: DeleteCourseDto,
    @Param('course_id') course_id: string,
    @GetUserRoles() roles: string[],
  ) {
    return this.coursesService.deleteCourse(course_id, deleteCourseDto, roles);
  }

  @Patch(':course_id/hide')
  hideCourse(
    @Body() updateCourseHideDto: UpdateCourseHideDto,
    @Param('course_id') course_id: string,
    @GetUserRoles() roles: string[],
  ) {
    return this.coursesService.hideCourse(course_id, updateCourseHideDto, roles);
  }

  @Get(':course_id/rating')
  getCourseRatings(@Param('course_id') course_id: string) {
    return this.coursesService.getCourseRatings(course_id);
  }

  @Post('rating')
  createCourseRating(@Body() createCourseRatingDto: CreateCourseRatingDto, @AuthContext() { user }: Passport) {
    return this.coursesService.createCourseRating(createCourseRatingDto, user.id);
  }

  @Post('enrolled')
  createCourseEnrolment(@Body() createCourseEnrolmentDto: CreateCourseEnrolmentDto, @AuthContext() { user }: Passport) {
    return this.coursesService.createCourseEnrolment(createCourseEnrolmentDto, user.id);
  }

  @Patch('enrolled')
  updateCourseLessonCompletion(
    @Body() updateCourseEnrolmentDto: UpdateCourseEnrolmentDto,
    @AuthContext() { user }: Passport,
  ) {
    return this.coursesService.updateCourseEnrolment(updateCourseEnrolmentDto, user.id);
  }

  @Get('enrolled')
  getUserEnrolledCourses(@AuthContext() { user }: Passport) {
    return this.coursesService.getEnrolledCourses(user.id);
  }

  @Get('user')
  getUserCourses(@AuthContext() { user }: Passport) {
    return this.coursesService.getUserCreatedCourses(user.id);
  }

  @Get('user-not-enrolled')
  getUserNotEnrolledCourses(@AuthContext() { user }: Passport) {
    return this.coursesService.getUserNotEnrolledCourses(user.id);
  }
}
