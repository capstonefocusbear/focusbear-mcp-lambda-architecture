import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { PusherBeamsService } from '../../../../../../libs/pusher-beams/src';
import { UserRepository } from '../../user/repositories/user.repository';
import { PusherBeamsAuthResponse } from '../dto/pusher-beams-auth-response.dto';

@Injectable()
export class PusherBeamsAuthService {
  constructor(
    private readonly pusherBeamsService: PusherBeamsService,
    private readonly userRepository: UserRepository,
  ) {}

  async getPusherBeamsToken(user_id: string): Promise<PusherBeamsAuthResponse> {
    const user = await this.userRepository.orm.findOne(user_id);
    if (!user) throw new NotFoundException(`User with id: ${user_id} does not exists!`);
    const token = this.pusherBeamsService.generateToken(user_id);
    if (!token) throw new ServiceUnavailableException(`Couldn't generate token for user with id: ${user_id}`);
    return token;
  }

  async unsubscribeFromBeams(user_id: string): Promise<void> {
    const user = await this.userRepository.orm.findOne(user_id);
    if (!user) throw new NotFoundException(`User with id: ${user_id} does not exists!`);
    return this.pusherBeamsService.deleteUser(user_id);
  }
}
