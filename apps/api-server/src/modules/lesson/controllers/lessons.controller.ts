import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { IsAuth } from '../../auth/guards/is-auth/is-auth.guard';
import { LessonsService } from '../services/lessons.service';
import { CreateLessonDto } from '../dto/create-lesson.dto';
import { CreateLessonRatingDto } from '../dto/create-lesson-rating.dto';
import { UpdateLessonDto } from '../dto/update-lesson.dto';
import { CreateLessonCompletionDto } from '../dto/create-lesson-completion.dto';
import { GetUserRoles } from '../../../shared/decorators/get-user-roles.decorator';
import { Passport } from '../../auth/domain/passport.model';
import { AuthContext } from 'apps/api-server/src/shared/decorators/passport.decorator';

@Controller('lesson')
@UseGuards(IsAuth)
@ApiTags('lesson')
@ApiSecurity('Auth0AccessToken')
export class LessonsController {
  constructor(private lessonsService: LessonsService) {}

  @Get(':course_id')
  getLessons(@Param('course_id') course_id: string) {
    return this.lessonsService.getLessons(course_id);
  }

  @Post()
  createLessons(@Body() createLessonDto: CreateLessonDto) {
    this.lessonsService.createLessons(createLessonDto);
  }

  @Patch()
  updateLessons(
    @Body() updateLessonDto: UpdateLessonDto,
    @AuthContext() { user }: Passport,
    @GetUserRoles() roles: string[],
  ) {
    this.lessonsService.updateLessons(updateLessonDto, user.id, roles);
  }

  // @Get(':course_id/:lesson_id/rating')
  // getLessonRatings(@Param('course_id') course_id: string, @Param('lesson_id') lesson_id: string) {
  //   return this.lessonsService.getLessonRatings(course_id, lesson_id);
  // }

  // @Post('rating')
  // createLessonRating(@Body() createLessonRatingDto: CreateLessonRatingDto, @AuthContext() { user }: Passport) {
  //   this.lessonsService.createLessonRating(createLessonRatingDto, user.id);
  // }

  @Post('complete')
  createLessonCompletion(
    @Body() createLessonCompletionDto: CreateLessonCompletionDto,
    @AuthContext() { user }: Passport,
  ) {
    this.lessonsService.createCompletedLesson(createLessonCompletionDto, user.id);
  }
}
