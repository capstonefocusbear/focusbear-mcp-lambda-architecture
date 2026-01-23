import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiSecurity } from '@nestjs/swagger';
import { AnnouncementsService } from '../services/announcements.service';
import { GetAnnouncementsQueryDto } from '../dto/get-announcements-query.dto';
import { GetAnnouncementsResponseDto } from '../dto/get-announcements-response.dto';
import { IsAuth } from '../../auth/guards/is-auth/is-auth.guard';
import { AuthContext } from '../../../shared/decorators/passport.decorator';
import { Passport } from '../../auth/domain/passport.model';

@Controller('announcements')
@ApiTags('announcements')
@UseGuards(IsAuth)
@ApiSecurity('Auth0AccessToken')
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get active announcements',
    description: 'Retrieve active, unread announcements for the authenticated user filtered by operating system',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved announcements',
    type: GetAnnouncementsResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid operating system parameter',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing authentication token',
  })
  async getAnnouncements(
    @Query() query: GetAnnouncementsQueryDto,
    @AuthContext() { user }: Passport,
  ): Promise<GetAnnouncementsResponseDto> {
    return this.announcementsService.getActiveAnnouncements(user.id, query.os_name);
  }
}
