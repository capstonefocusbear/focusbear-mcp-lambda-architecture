import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from '../../repositories/user.repository';
import { UserFeedbackRepository } from '../../repositories/user-feedback.repository';
import { UserFeedback } from '../../entities/user-feedback.entity';
import { UserFeedbackDto } from '../../dto/user-feedback.dto';

@Injectable()
export class UserFeedbackService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly userFeedbackRepository: UserFeedbackRepository,
  ) {}

  async saveUserFeedback(userId: string, { rating, feedback, metadata }: UserFeedbackDto) {
    const user = await this.userRepository.orm.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException(`User with ID: ${userId} does not exist!`);
    }
    const savedFeedback = new UserFeedback({ user_id: userId, rating, feedback, metadata });
    await this.userFeedbackRepository.orm.save(savedFeedback);
    await this.userRepository.update(userId, { last_date_gave_feedback: new Date() });
  }
}
