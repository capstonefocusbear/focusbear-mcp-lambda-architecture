import { Body, Controller, Put, UseGuards } from '@nestjs/common';
import { HasAuth0ActionSecret } from '../../../auth/guards/has-auth0-action-secret/has-auth0-action-secret.guard';
import { SyncUserAccountDto } from '../../dto/sync-user-account.dto';
import { User } from '../../entities/user.entity';
import { UserService } from '../../services/user/user.service';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(HasAuth0ActionSecret)
  @Put('/account-sync')
  syncUserAccount(@Body() { auth0_id, email }: SyncUserAccountDto): Promise<Partial<User>> {
    return this.userService.syncUserAccount({ auth0_id, email });
  }
}
