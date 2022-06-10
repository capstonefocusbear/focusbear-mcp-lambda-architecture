import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AuthContext } from '../../../shared/decorators/passport.decorator';
import { Passport } from '../../auth/domain/passport.model';
import { IsAuth } from '../../auth/guards/is-auth/is-auth.guard';
import { CreateCompletedActivityDto } from '../dto/create-completed-activity.dto';
import { CompletedActivityService } from '../services/completed-activity/completed-activity.service';

@Controller('completed-activity')
@UseGuards(IsAuth)
@ApiTags('completed-activity')
@ApiSecurity('Auth0AccessToken')
export class CompletedActivityController {
  constructor(private readonly completedActivityService: CompletedActivityService) {}

  @Post()
  createCompletedActivity(@Body() completedActivity: CreateCompletedActivityDto, @AuthContext() { user }: Passport) {
    return this.completedActivityService.compliteActivity(completedActivity, { user_id: user.id });
  }
}
