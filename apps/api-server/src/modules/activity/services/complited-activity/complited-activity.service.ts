import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DeviceService } from '../../../device/services/device/device.service';
import { GetUserSettingsDto } from '../../../user/dto/get-user-settings.dto';
import { UserRepository } from '../../../user/repositories/user.repository';
import { CreateComplitedActivityDto } from '../../dto/create-complited-activity.dto';
import { ActivitySequence } from '../../entities/activity-sequence.entity';
import { ComplitedActivity } from '../../entities/complited-activity.entity';
import { ActivitySequenceRepository } from '../../repositories/activity-sequence.repository';
import { ComplitedActivityRepository } from '../../repositories/complited-activity.repository';

@Injectable()
export class ComplitedActivityService {
  constructor(
    private readonly complitedActivityRepository: ComplitedActivityRepository,
    private readonly deviceService: DeviceService,
    private readonly activitySequenceRepository: ActivitySequenceRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async compliteActivity(
    complitedActivity: CreateComplitedActivityDto,
    { user_id }: GetUserSettingsDto,
  ): Promise<ComplitedActivity> {
    const { device_id, activity_sequence_id, activity_id } = complitedActivity;
    const sequence = await this.activitySequenceRepository.orm.findOne(activity_sequence_id);
    if (!sequence) throw new NotFoundException(`Activity Sequence with id: ${activity_sequence_id} does not exist!`); // +
    const nextCurrentActivity = this.defineNextCurrentActivity(sequence, activity_id); // +
    await this.deviceService.markAsLeader(device_id, user_id); // +
    await this.userRepository.orm.update(user_id, { ...nextCurrentActivity }); // +
    const newComplitedActivity = new ComplitedActivity({ ...complitedActivity, user_id });
    return this.complitedActivityRepository.create(newComplitedActivity); // +
  }

  private defineNextCurrentActivity(
    sequence: ActivitySequence,
    activity_id: string,
  ): {
    current_activity_sequence_id: string | null;
    current_activity_id: string | null;
  } {
    const { activity_ids, id } = sequence;
    const complitedActivityIndexInTheSequence = activity_ids.findIndex((e) => e === activity_id);
    const noActivityInTheSequense = complitedActivityIndexInTheSequence === -1;
    const noActivityInTheSequenseMessage = `Activity with id: ${activity_id} does not exist in the Secuense with id: ${id}!`;
    if (noActivityInTheSequense) throw new ConflictException(noActivityInTheSequenseMessage);
    const nextActivity = activity_ids[complitedActivityIndexInTheSequence + 1];
    const current_activity_id = nextActivity || null;
    const current_activity_sequence_id = nextActivity ? id : null;
    return { current_activity_sequence_id, current_activity_id };
  }
}
