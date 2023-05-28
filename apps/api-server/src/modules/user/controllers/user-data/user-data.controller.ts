import { Controller, Delete, Get, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AuthContext } from '../../../../shared/decorators/passport.decorator';
import { Passport } from '../../../auth/domain/passport.model';
import { IsAuth } from '../../../auth/guards/is-auth/is-auth.guard';
import { UserDataService } from '../../services/user-data/user-data.service';

@Controller('user-data')
@UseGuards(IsAuth)
@ApiTags('user-data')
@ApiSecurity('Auth0AccessToken')
export class UserDataController {
  constructor(private readonly userDataService: UserDataService) {}

  @Get()
  getUserPersonalData(@AuthContext() { user }: Passport) {
    return this.userDataService.processAndEmailUserData(user.id);
  }

  @Delete()
  @ApiOperation({
    summary:
      'This endpoint deletes all user data from Auth0, RevenueCat, Stripe, and from the DB. DATA IS NOT RECOVERABLE',
  })
  async deleteAllUserData(@AuthContext() { user }: Passport) {
    return this.userDataService.deleteUser(user.id);
  }
}
