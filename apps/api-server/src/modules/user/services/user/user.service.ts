import { Injectable, NotFoundException } from '@nestjs/common';
import { Auth0ManagementService } from '../../../../../../../libs/auth0/src';
import { UserRepository } from '../../repositories/user.repository';
import { SyncUserAccountDto } from '../../dto/sync-user-account.dto';
import { UserAuthContext } from '../../../auth/domain/user-auth-context.model';
import { User } from '../../entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly auth0ManagementService: Auth0ManagementService,
  ) {}

  async syncUserAccount({ auth0_id, email }: SyncUserAccountDto): Promise<UserAuthContext> {
    const auth0User = await this.auth0ManagementService.getUser({ id: auth0_id }).catch(() => undefined);
    if (!auth0User) throw new NotFoundException('User does not exit in Auth0!');
    const { id } = await this.userRepository.upsert({ auth0_id, email }, ['auth0_id']);
    return { id };
  }

  async getUserDetails(id: string): Promise<User> {
    const userDetails = await this.userRepository.getUserDetails(id);
    if (!userDetails) throw new NotFoundException(`User with id: ${id} does not exit!`);
    return userDetails;
  }
}
