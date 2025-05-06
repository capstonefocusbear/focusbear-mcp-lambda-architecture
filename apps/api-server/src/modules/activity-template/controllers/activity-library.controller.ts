import { Body, Controller, Get, Post, Put, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AuthContext } from '../../../shared/decorators/passport.decorator';
import { UpdateActivityDto } from '../../activity/dto/update-activity.dto';
import { Passport } from '../../auth/domain/passport.model';
import { IsAuth } from '../../auth/guards/is-auth/is-auth.guard';
import { UpdateActivityTemplateDto } from '../dto/activity-template.dto';
import { ActivityLibraryService } from '../services/activity-library.service';
import { GetRoutineSuggestionsDto } from '../dto/get-routine-suggestions.dto';

@Controller('activity-library')
@ApiTags('activity-library')
@UseGuards(IsAuth)
@ApiSecurity('Auth0AccessToken')
export class ActivityLibraryController {
  constructor(private readonly activityLibraryService: ActivityLibraryService) {}

  @Get()
  async getLibraryActivities(@AuthContext() { user }: Passport): Promise<UpdateActivityDto[]> {
    return this.activityLibraryService.getLibraryActivities(user.id);
  }

  @Put()
  async upsertLibraryActivities(
    @Body() updateLibraryActivities: UpdateActivityTemplateDto[],
    @AuthContext() { user }: Passport,
  ) {
    return this.activityLibraryService.upsertLibraryActivities(updateLibraryActivities, user.id);
  }

  @Post('/routine-suggestions')
  async getRoutineSuggestions(
    @Body() getRoutineSuggestionsDto: GetRoutineSuggestionsDto,
    @AuthContext() { user }: Passport,
  ) {
    return this.activityLibraryService.getActivitiesRelatedToUserGoals(getRoutineSuggestionsDto, user.id);
  }
}
