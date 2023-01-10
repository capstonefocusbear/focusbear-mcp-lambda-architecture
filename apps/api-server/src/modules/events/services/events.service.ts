import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bull';
import { TrackEventDto } from '../dto/track-event.dto';

@Injectable()
export class EventsService {
  constructor(@InjectQueue('events') private eventsQueue: Queue) {}

  async addEventToQueue(trackEventDto: TrackEventDto, user_id: string) {
    await this.eventsQueue.add('track-event', {
      user_id,
      trackEventDto,
    });
  }
}
