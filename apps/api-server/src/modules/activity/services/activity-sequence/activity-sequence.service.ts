import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { User } from '../../../user/entities/user.entity';
import { UserRepository } from '../../../user/repositories/user.repository';
import { StartFlexSequenceDto } from '../../dto/start-flex-sequence.dto';
import { ActivitySequence } from '../../entities/activity-sequence.entity';
import { ActivitySequenceRepository } from '../../repositories/activity-sequence.repository';

@Injectable()
export class ActivitySequenceService {
  constructor(
    private readonly activitySequenceRepository: ActivitySequenceRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async startFlexSequence(
    sequence_id: string,
    user_id: string,
    { generated_sequence_activity_ids }: StartFlexSequenceDto,
  ): Promise<any> {
    const [sequence, user] = await this.fetchPreparatoryData(sequence_id, user_id);
    this.validateInitialSequence(sequence, user, { sequence_id, user_id });
    this.validateGeneratedSequence(sequence, generated_sequence_activity_ids);
    const total = await this.activitySequenceRepository.countSequenceTotalDuration(generated_sequence_activity_ids);
    return this.saveUserWithUpdatedSequence(sequence, user, {
      generated_sequence_activity_ids,
      generated_total_duration_seconds: total,
    });
  }

  private async fetchPreparatoryData(sequence_id: string, user_id: string): Promise<[ActivitySequence, User]> {
    const sequencePromise = this.activitySequenceRepository.findOneByIdForUser(sequence_id, user_id);
    const userPromise = this.userRepository.orm.findOne(user_id);
    return Promise.all([sequencePromise, userPromise]);
  }

  private validateInitialSequence(sequence: ActivitySequence, user: User, { sequence_id, user_id }): never | void {
    const sequenceDoesNotExistForUserMsg = `The sequence with id: ${sequence_id} does not exist for user with id: ${user_id}!`;
    if (!sequence) throw new NotFoundException(sequenceDoesNotExistForUserMsg);
    const userDoesNotExistMsg = `The user with id: ${user_id} does not exist!`;
    if (!user) throw new NotFoundException(userDoesNotExistMsg);
    const hasUserUncompletedCurrentSequence = user?.current_activity_sequence_id;
    const userHasCurrentSequenceMsg = `The user has uncompleted current sequence with id: ${user.current_activity_sequence_id}!`;
    if (hasUserUncompletedCurrentSequence) throw new BadRequestException(userHasCurrentSequenceMsg);
  }

  private validateGeneratedSequence(
    { activity_ids }: ActivitySequence,
    generated_sequence_activity_ids: string[],
  ): never | void {
    const checkActivityExistence = (e: string) => activity_ids.includes(e);
    const isGeneratedSequenceConsistent = generated_sequence_activity_ids.every(checkActivityExistence);
    const assosiatedIdsString = `Assosiated activity ids: ${activity_ids.join(', ')}.`;
    const generatedIdsString = `Generated sequence activity ids: ${generated_sequence_activity_ids.join(', ')}.`;
    const generalMsg = 'The generated sequence contains id(s) which is not associated with the given sequence!';
    const inconsistentSequenceMsg = `${generalMsg}\n${assosiatedIdsString}\n${generatedIdsString}`;
    if (!isGeneratedSequenceConsistent) throw new BadRequestException(inconsistentSequenceMsg);
  }

  private async saveUserWithUpdatedSequence(
    sequence: ActivitySequence,
    user: User,
    { generated_sequence_activity_ids, generated_total_duration_seconds },
  ) {
    const updatedSequence = { ...sequence, generated_sequence_activity_ids, generated_total_duration_seconds };
    const [current_activity_id] = generated_sequence_activity_ids;
    const current_activity_assigned_at = new Date();
    const current_activity_sequence_id = sequence.id;
    const currentUserProps = { current_activity_id, current_activity_sequence_id, current_activity_assigned_at };
    const updatedUser = { ...user, ...currentUserProps };
    const savedSequencePromise = this.activitySequenceRepository.orm.save(updatedSequence);
    const savedUserPromise = this.userRepository.orm.save(updatedUser);
    return Promise.all([savedSequencePromise, savedUserPromise]);
  }
}
