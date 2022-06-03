import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { ActivityData } from '../domain/activity-data.model';
import { ActivityType } from '../domain/activity-type.enum';
import { LogQuantitySummaryType } from '../domain/log-quantity-summary-type.enum';
import { ActivitySequence } from './activity-sequence.entity';

@Entity('activities')
export class Activity extends BaseEntity {
  constructor({ id, ...activity }: Partial<Activity> = {}, options = { generateId: false }) {
    super(id, options);
    Object.assign(this, { ...activity });
  }

  @Column({
    type: 'uuid',
    nullable: false,
  })
  user_id?: string;

  @Column({
    type: 'uuid',
    nullable: false,
  })
  activity_sequence_id?: string;

  @Column({
    type: 'enum',
    name: 'activity_type',
    enum: ActivityType,
    nullable: false,
  })
  type?: ActivityType;

  @Column({
    type: 'enum',
    enum: LogQuantitySummaryType,
    nullable: false,
  })
  log_quantity_summary_type?: string;

  @Column({
    type: 'jsonb',
    nullable: false,
    transformer: BaseEntity.encrypteJSONField(),
  })
  activity_data?: ActivityData;

  @ManyToOne(() => ActivitySequence, (activity_sequence) => activity_sequence.activities)
  @JoinColumn({ name: 'activity_sequence_id' })
  activity_sequence?: ActivitySequence;
}
