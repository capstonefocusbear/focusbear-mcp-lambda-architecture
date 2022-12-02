import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { SendinblueService } from '../../../../../../libs/sendinblue/src/sendinblue.service';
import { UserRepository } from '../../user/repositories/user.repository';
import { TrackEventDto } from '../dto/track-event.dto';

@Injectable()
export class EventsService {
  constructor(
    private readonly sendinblueService: SendinblueService,
    private readonly userRepository: UserRepository,
    @InjectSentry() private readonly sentryService: SentryService,
  ) {}

  async registerEvent(trackEventDto: TrackEventDto, user_id: string) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Registering sendinblue event',
        data: {
          user_id,
          treack_event: trackEventDto,
        },
      });
      const user = await this.userRepository.orm.findOneBy({ id: user_id });
      if (!user) throw new NotFoundException(`User with ID: ${user_id} does not exist!`);
      await this.sendinblueService.registerSendinblueEvent(user.email, trackEventDto);
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
  }
}
