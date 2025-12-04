import { Body, Controller, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiSecurity } from '@nestjs/swagger';
import { IsAuth } from '../../auth/guards/is-auth/is-auth.guard';
import { AuthContext } from '../../../shared/decorators/passport.decorator';
import { Passport } from '../../auth/domain/passport.model';
import { AnnouncementViewsService } from '../services/announcement-views.service';
import { ViewAnnouncementParamDto } from '../dto/view-announcement-param.dto';
import { ViewAnnouncementDto } from '../dto/view-announcement.dto';

@Controller('announcements')
@ApiTags('announcements')
@UseGuards(IsAuth)
@ApiSecurity('Auth0AccessToken')
export class AnnouncementViewsController {
  constructor(private readonly announcementViewsService: AnnouncementViewsService) {}

  @Post(':id/view')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Mark announcement as viewed',
    description: 'Record that a user has viewed or dismissed an announcement. This operation is idempotent.',
  })
  @ApiResponse({
    status: 204,
    description: 'Announcement successfully marked as viewed',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request parameters',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing authentication token',
  })
  @ApiResponse({
    status: 404,
    description: 'Announcement not found',
  })
  async viewAnnouncement(
    @Param() params: ViewAnnouncementParamDto,
    @Body() dto: ViewAnnouncementDto,
    @AuthContext() { user }: Passport,
  ): Promise<void> {
    await this.announcementViewsService.markAnnouncementAsViewed(user.id, params.id, dto);
  }
}
