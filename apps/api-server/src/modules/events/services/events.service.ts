import { InjectQueue } from '@nestjs/bull';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Queue } from 'bull';
import { UserRepository } from '../../user/repositories/user.repository';
import { TrackEventDto } from '../dto/track-event.dto';

@Injectable()
export class EventsService {
  constructor(@InjectQueue('events') private eventsQueue: Queue, private readonly userRepository: UserRepository) {}

  async addEventToQueue(trackEventDto: TrackEventDto, user_id: string) {
    const user = await this.userRepository.orm.findOneBy({ id: user_id });
    if (!user) throw new NotFoundException(`User with ID: ${user_id} does not exist!`);
    await this.eventsQueue.add('track-event', {
      user_id,
      email: user.email,
      trackEventDto,
    });
  }
}
