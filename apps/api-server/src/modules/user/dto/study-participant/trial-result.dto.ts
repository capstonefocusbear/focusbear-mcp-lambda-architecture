import { TrialResult } from '../../entities/flanker-test.entity';

export class TrialResultDto implements TrialResult {
  trialIndex: number;

  stimulusType: 'congruent' | 'incongruent';

  correctDirection: 'left' | 'right';

  userResponse: 'left' | 'right' | null;

  isCorrect: boolean;

  reactionTimeMs: number | null;
}
