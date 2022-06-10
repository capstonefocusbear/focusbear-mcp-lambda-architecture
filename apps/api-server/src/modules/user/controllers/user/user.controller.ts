import { Body, Controller, Put, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { UserAuthContext } from '../../../auth/domain/user-auth-context.model';
import { HasAuth0ActionSecret } from '../../../auth/guards/has-auth0-action-secret/has-auth0-action-secret.guard';
import { SyncUserAccountDto } from '../../dto/sync-user-account.dto';
import { UserService } from '../../services/user/user.service';

@Controller('user')
@ApiTags('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Put('/account-sync')
  @ApiSecurity('Auth0ActionSecret')
  @ApiOperation({ summary: 'This route shoude be used in the Auth0 post-login action!' })
  @UseGuards(HasAuth0ActionSecret)
  syncUserAccount(@Body() { auth0_id, email }: SyncUserAccountDto): Promise<UserAuthContext> {
    return this.userService.syncUserAccount({ auth0_id, email });
  }
}
