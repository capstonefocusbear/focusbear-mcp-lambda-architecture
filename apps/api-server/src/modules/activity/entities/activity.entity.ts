import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { ActivityData } from '../domain/activity-data.model';
import { ActivityType } from '../domain/activity-type.enum';
import { LogQuantitySummaryType } from '../domain/log-quantity-summary-type.enum';

@Entity('activities')
export class Activity extends BaseEntity {
  @Column({
    type: 'uuid',
    nullable: false,
  })
  user_id: string;

  @Column({
    type: 'uuid',
    nullable: false,
  })
  activity_sequence_id: string;

  @Column({
    type: 'enum',
    enum: ActivityType,
    nullable: false,
  })
  activity_type: ActivityType;

  @Column({
    type: 'enum',
    enum: LogQuantitySummaryType,
    nullable: false,
  })
  log_quantity_summary_type: string;

  @Column({
    type: 'jsonb',
    nullable: false,
  })
  activity_data: ActivityData;
}
