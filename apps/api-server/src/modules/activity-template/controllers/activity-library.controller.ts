import { Body, Controller, Get, Post, Put, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthContext } from '../../../shared/decorators/passport.decorator';
import { UpdateActivityDto } from '../../activity/dto/update-activity.dto';
import { Passport } from '../../auth/domain/passport.model';
import { IsAuth } from '../../auth/guards/is-auth/is-auth.guard';
import { UpdateActivityTemplateDto } from '../dto/activity-template.dto';
import { ActivityLibraryService } from '../services/activity-library.service';
import { GetRoutineSuggestionsDto } from '../dto/get-routine-suggestions.dto';
import { AdjustHabitsWithAiDto } from '../dto/adjust-habits-with-ai.dto';

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

  @Post('/adjust-habits-with-ai')
  @ApiOperation({ summary: 'Adjust habits using AI based on user feedback' })
  @ApiResponse({ status: 200, description: 'Habits adjusted successfully', type: [UpdateActivityTemplateDto] })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async adjustHabitsWithAi(@Body() adjustHabitsWithAiDto: AdjustHabitsWithAiDto, @AuthContext() { user }: Passport) {
    return this.activityLibraryService.adjustHabitsWithAi(adjustHabitsWithAiDto, user.id);
  }
}
