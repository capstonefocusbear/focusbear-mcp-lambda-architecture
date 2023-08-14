import { Controller, Delete, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AuthContext } from '../../../../shared/decorators/passport.decorator';
import { Passport } from '../../../auth/domain/passport.model';
import { IsAuth } from '../../../auth/guards/is-auth/is-auth.guard';
import { UserDataService } from '../../services/user-data/user-data.service';
import { GetUserDataQuery } from '../../dto/get-user-data-query.dto';
import { DeleteUserQueryParamDto } from '../../dto/delete-user-query-params.dto';

@Controller('user-data')
@UseGuards(IsAuth)
@ApiTags('user-data')
@ApiSecurity('Auth0AccessToken')
export class UserDataController {
  constructor(private readonly userDataService: UserDataService) {}

  @Get()
  getUserPersonalData(@Query() { language }: GetUserDataQuery, @AuthContext() { user }: Passport) {
    return this.userDataService.processAndEmailUserData(user.id, language);
  }

  @Delete()
  @ApiOperation({
    summary:
      'This endpoint deletes all user data from Auth0, RevenueCat, Stripe, and from the DB. DATA IS NOT RECOVERABLE',
  })
  async deleteAllUserData(
    @Query() { message, can_contact }: DeleteUserQueryParamDto,
    @AuthContext() { user }: Passport,
  ) {
    return this.userDataService.deleteUser(user.id, { message, can_contact });
  }
}
