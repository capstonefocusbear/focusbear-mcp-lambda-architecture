import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { PusherBeamsService } from '@app/pusher-beams';
import { UserRepository } from '../../user/repositories/user.repository';
import { PusherBeamsAuthResponse } from '../dto/pusher-beams-auth-response.dto';

@Injectable()
export class PusherBeamsAuthService {
  constructor(
    private readonly pusherBeamsService: PusherBeamsService,
    private readonly userRepository: UserRepository,
    @InjectSentry() private readonly sentryService: SentryService,
  ) {}

  async getPusherBeamsToken(user_id: string): Promise<PusherBeamsAuthResponse> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Getting token from Pusher beams',
        data: {
          user_id,
        },
      });
      const user = await this.userRepository.orm.findOneBy({ id: user_id });
      if (!user) throw new NotFoundException(`User with id: ${user_id} does not exists!`);
      const token = this.pusherBeamsService.generateToken(user_id);
      if (!token) throw new ServiceUnavailableException(`Couldn't generate token for user with id: ${user_id}`);
      return token;
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
  }

  async unsubscribeFromBeams(user_id: string): Promise<void> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Unsubscribe user from Beams',
        data: {
          user_id,
        },
      });
      const user = await this.userRepository.orm.findOneBy({ id: user_id });
      if (!user) throw new NotFoundException(`User with id: ${user_id} does not exists!`);
      return await this.pusherBeamsService.deleteUser(user_id);
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
  }
}
