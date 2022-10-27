import { Injectable, NotFoundException } from '@nestjs/common';
import { SendinblueService } from '../../../../../../libs/sendinblue/src/sendinblue.service';
import { UserRepository } from '../../user/repositories/user.repository';
import { TrackEventDto } from '../dto/track-event.dto';

@Injectable()
export class EventsService {
  constructor(private readonly sendinblueService: SendinblueService, private readonly userRepository: UserRepository) {}

  async registerEvent(trackEventDto: TrackEventDto, user_id: string) {
    const user = await this.userRepository.orm.findOne(user_id);
    if (!user) throw new NotFoundException(`User with ID: ${user_id} does not exist!`);
    await this.sendinblueService.registerSendinblueEvent(user.email, trackEventDto);
  }
}
