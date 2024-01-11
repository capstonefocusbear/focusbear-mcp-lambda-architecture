import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { User } from '../../user/entities/user.entity';

@Entity('track_event')
export class TrackEvent extends BaseEntity {
  constructor({ id, ...trackEvent }: Partial<TrackEvent> = {}, options = { generateId: false }) {
    super(id, options);
    Object.assign(this, { ...trackEvent });
  }

  @Column({ type: 'uuid', nullable: false })
  user_id: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  event_type: string;

  @Column({ type: 'jsonb', nullable: true })
  user_properties: any;

  @Column({ type: 'jsonb', nullable: true })
  event_data: any;

  @Column({ type: 'varchar', length: 255, nullable: true })
  operating_system: string;

  @ManyToOne(() => User, (user) => user.impact_events, { onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;
}
