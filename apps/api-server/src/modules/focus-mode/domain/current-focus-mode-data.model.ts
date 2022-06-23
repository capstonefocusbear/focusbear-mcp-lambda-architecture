import { User } from '../../user/entities/user.entity';

interface CreateCurrentFocusModeData {
  finish_time: Date;
  focus_mode_id: string;
  completed_mode_id: string;
}

export class CurrentFocusModeData implements Partial<User> {
  constructor({ finish_time, focus_mode_id, completed_mode_id }: Partial<CreateCurrentFocusModeData> = {}) {
    this.current_focus_mode_id = focus_mode_id;
    this.current_focus_mode_finish_time = finish_time;
    this.current_completing_focus_block_id = completed_mode_id;
  }

  current_focus_mode_id: string;

  current_focus_mode_finish_time: Date;

  current_completing_focus_block_id: string;
}
