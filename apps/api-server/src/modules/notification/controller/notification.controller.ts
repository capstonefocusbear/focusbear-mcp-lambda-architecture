import { Body, Controller, Patch, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AuthContext } from '../../../shared/decorators/passport.decorator';
import { Passport } from '../../auth/domain/passport.model';
import { IsAuth } from '../../auth/guards/is-auth/is-auth.guard';
import { UpdateCalendarEventDto } from '../dto/updateCalendarEvent.dto';
import { NotificationService } from '../services/notification.service';

@Controller('notifications')
@ApiTags('notifications')
@UseGuards(IsAuth)
@ApiSecurity('Auth0AccessToken')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Patch()
  updateOrCreateCalendarEvent(
    @Body() updateCalendarEventDto: UpdateCalendarEventDto,
    @AuthContext() { user }: Passport,
  ) {
    // account part remained yet
    return this.notificationService.updateOrCreateCalendarEvent(updateCalendarEventDto, user.id, 'account');
  }
}
