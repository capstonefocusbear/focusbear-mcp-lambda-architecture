import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { IsAuth } from '../../auth/guards/is-auth/is-auth.guard';
import { LessonsService } from '../services/lessons.service';
import { UpsertLessonsDto } from '../dto/upsert-lessons.dto';
import { CreateLessonCompletionDto } from '../dto/create-lesson-completion.dto';
import { GetUserRoles } from '../../../shared/decorators/get-user-roles.decorator';
import { Passport } from '../../auth/domain/passport.model';
import { AuthContext } from '../../../shared/decorators/passport.decorator';
import { DeleteLessonDto } from '../dto/delete-lesson.dto';

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

  @Patch()
  upsertLessons(
    @Body() upsertLessonsDto: UpsertLessonsDto,
    @AuthContext() { user }: Passport,
    @GetUserRoles() roles: string[],
  ) {
    this.lessonsService.upsertLessons(upsertLessonsDto, user.id, roles);
  }

  @Post('complete')
  createLessonCompletion(
    @Body() createLessonCompletionDto: CreateLessonCompletionDto,
    @AuthContext() { user }: Passport,
  ) {
    this.lessonsService.createCompletedLesson(createLessonCompletionDto, user.id);
  }

  @Delete()
  deleteLesson(@Body() deleteLessonDto: DeleteLessonDto) {
    this.lessonsService.deleteCourseLesson(deleteLessonDto);
  }
}
