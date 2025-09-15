// src/debug/debug.controller.ts
import { Body, Controller, Post } from '@nestjs/common';
import { CompletedActivitySequenceService } from '../services/completed-activity-sequence/completed-activity-sequence.service';
import { UserRepository } from '../../user/repositories/user.repository';

interface DebugSeqBody {
  user_id: string;
  activity_sequence_id: string;
  start_time: string; // ISO
}

@Controller('debug/sequence-log')
export class DebugSequenceLogController {
  constructor(private readonly seqSvc: CompletedActivitySequenceService, private readonly users: UserRepository) {}

  private async getUserOrThrow(id: string) {
    const u = await this.users.orm.findOne({ where: { id }, relations: ['completing_sequence_log'] });
    if (!u) throw new Error('User not found');
    return u;
  }

  @Post('live')
  async live(@Body() b: DebugSeqBody) {
    const user = await this.getUserOrThrow(b.user_id);
    const result = await this.seqSvc.getOrCreateCompletingSequenceLog(
      user,
      b.activity_sequence_id,
      new Date(b.start_time),
    );
    return { returned_id: result?.id, is_completed: result?.is_completed ?? null };
  }

  @Post('sync')
  async sync(@Body() b: DebugSeqBody) {
    const user = await this.getUserOrThrow(b.user_id);
    const result = await this.seqSvc.getOrCreateCompletingSequenceLogForSyncing(
      user,
      b.activity_sequence_id,
      new Date(b.start_time),
    );
    return { returned_id: result?.id, is_completed: result?.is_completed ?? null };
  }
}
