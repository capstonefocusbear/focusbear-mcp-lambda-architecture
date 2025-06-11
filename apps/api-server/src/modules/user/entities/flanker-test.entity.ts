import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { StudyParticipant } from './study-participant.entity';

export interface TrialResult {
  trialIndex: number;
  stimulusType: 'congruent' | 'incongruent';
  correctDirection: 'left' | 'right';
  userResponse: 'left' | 'right';
  isCorrect: boolean;
  reactionTimeMs: number | null;
}

@Entity('flanker_tests')
export class FlankerTest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'study_participant_id' })
  studyParticipantId: string;

  @ManyToOne(() => StudyParticipant)
  @JoinColumn({ name: 'study_participant_id' })
  studyParticipant: StudyParticipant;

  @Column({ name: 'total_trials' })
  totalTrials: number;

  @Column({ name: 'missed_trials' })
  missedTrials: number;

  @Column({ name: 'overall_accuracy', type: 'decimal', precision: 4, scale: 3 })
  overallAccuracy: number;

  @Column({ name: 'congruent_accuracy', type: 'decimal', precision: 4, scale: 3 })
  congruentAccuracy: number;

  @Column({ name: 'incongruent_accuracy', type: 'decimal', precision: 4, scale: 3 })
  incongruentAccuracy: number;

  @Column({ name: 'mean_rt_congruent' })
  meanRtCongruent: number;

  @Column({ name: 'mean_rt_incongruent' })
  meanRtIncongruent: number;

  @Column({ name: 'trial_results', type: 'jsonb' })
  trialResults: TrialResult[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
