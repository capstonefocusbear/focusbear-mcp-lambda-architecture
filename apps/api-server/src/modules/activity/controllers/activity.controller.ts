import { Controller, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AuthContext } from '../../../shared/decorators/passport.decorator';
import { Passport } from '../../auth/domain/passport.model';
import { IsAuth } from '../../auth/guards/is-auth/is-auth.guard';
import { ActivityService } from '../services/activity-service/activity.service';

@Controller('activity')
@UseGuards(IsAuth)
@ApiTags('activity')
@ApiSecurity('Auth0AccessToken')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Delete('/images')
  deleteActivityImage(@Query() { file_path }: { file_path: string }, @AuthContext() { user }: Passport) {
    return this.activityService.deleteActivityImageFromUploadIO(user.id, file_path);
  }
}
