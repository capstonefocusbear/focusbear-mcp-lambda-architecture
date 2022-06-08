import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AuthContext } from '../../../shared/decorators/passport.decorator';
import { Passport } from '../../auth/domain/passport.model';
import { IsAuth } from '../../auth/guards/is-auth/is-auth.guard';
import { CreateComplitedActivityDto } from '../dto/create-complited-activity.dto';
import { ComplitedActivityService } from '../services/complited-activity/complited-activity.service';

@Controller('complited-activity')
@UseGuards(IsAuth)
@ApiTags('complited-activity')
@ApiSecurity('Auth0AccessToken')
export class ComplitedActivityController {
  constructor(private readonly complitedActivityService: ComplitedActivityService) {}

  @Post()
  createComplitedActivity(@Body() complitedActivity: CreateComplitedActivityDto, @AuthContext() { user }: Passport) {
    return this.complitedActivityService.compliteActivity(complitedActivity, { user_id: user.id });
  }
}
