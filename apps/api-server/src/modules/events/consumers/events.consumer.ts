import { Process, Processor } from '@nestjs/bull';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { Job } from 'bull';
import * as axios from 'axios';
import { NotFoundException } from '@nestjs/common';
import { SendinblueService } from '../../../../../../libs/sendinblue/src/sendinblue.service';
import { UserRepository } from '../../user/repositories/user.repository';
import { TrackEventDto } from '../dto/track-event.dto';

@Processor('events')
export class EventsConsumer {
  constructor(
    @InjectSentry() private readonly sentryService: SentryService,
    private readonly userRepository: UserRepository,
    private readonly sendinblueService: SendinblueService,
  ) {}

  @Process('track-event')
  async readOperationJob(job: Job<{ trackEventDto: TrackEventDto; user_id: string }>) {
    const {
      data: { user_id, trackEventDto },
    } = job;
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
      await axios.default.post(process.env.SLACK_BACKEND_ALERTS_WEBHOOK, {
        text: `Error in track-event queue for user with ID: ${user_id}\nTrack event: \`\`\`${JSON.stringify(
          trackEventDto,
        )}\`\`\`\nError: \`\`\`${error}\`\`\``,
      });
    }
  }
}
