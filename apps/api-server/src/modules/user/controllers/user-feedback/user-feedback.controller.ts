import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { IsAuth } from '../../../auth/guards/is-auth/is-auth.guard';
import { AuthContext } from '../../../../shared/decorators/passport.decorator';
import { Passport } from '../../../auth/domain/passport.model';
import { UserFeedbackService } from '../../services/user-feedback/user-feedback.service';
import { UserFeedbackDto } from '../../dto/user-feedback.dto';

@Controller('user-feedback')
@UseGuards(IsAuth)
@ApiTags('user-feedback')
@ApiSecurity('Auth0AccessToken')
export class UserFeedbackController {
  constructor(private readonly userFeedbackService: UserFeedbackService) {}

  @Post()
  async saveUserFeedback(@Body() feedbackData: UserFeedbackDto, @AuthContext() { user }: Passport) {
    return this.userFeedbackService.saveUserFeedback(user.id, feedbackData);
  }
}
