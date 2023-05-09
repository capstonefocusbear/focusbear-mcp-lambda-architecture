import { Controller, Delete, Get, Query, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AuthContext } from '../../../shared/decorators/passport.decorator';
import { Passport } from '../../auth/domain/passport.model';
import { IsAuth } from '../../auth/guards/is-auth/is-auth.guard';
import { ActivityService } from '../services/activity-service/activity.service';
import { IsAdmin } from '../../auth/guards/is-admin/is-admin.guard';
import { GetActivitiesForAdminQueryDto } from '../dto/get-activities-for-admin.dto';

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

  @Get()
  @UseGuards(IsAdmin)
  async getActivitiesForAdmin(
    @Query() { user_id, stripe_customer_id, activity_type, page_num }: GetActivitiesForAdminQueryDto,
    @AuthContext() { user: admin }: Passport,
  ) {
    return this.activityService.getUserActivitiesForAdmin(admin.id, {
      user_id,
      stripe_customer_id,
      activity_type,
      page_num,
    });
  }
}
