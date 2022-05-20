import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';

@Entity('users')
export class User extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 255,
    nullable: false,
    unique: true,
  })
  email?: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: false,
    unique: true,
  })
  auth0_id?: string;

  @Column({
    type: 'varchar',
    length: 255,
  })
  first_name?: string;

  @Column({
    type: 'varchar',
    length: 255,
  })
  startup_time?: string;

  @Column({
    type: 'varchar',
    length: 255,
  })
  shutdownTime?: string;

  @Column({
    type: 'varchar',
    length: 255,
  })
  break_after_minutes?: number;

  @Column({
    type: 'timestamptz',
  })
  current_focus_mode_finish_time?: string;

  @Column({
    type: 'varchar',
    length: 255,
  })
  password_for_settings?: string;

  @Column({
    type: 'boolean',
  })
  is_office_mode_activated: boolean;

  @Column({
    type: 'uuid',
  })
  current_activity_sequence_id: string;

  @Column({
    type: 'uuid',
  })
  current_focus_mode_id: string;

  @Column({
    type: 'uuid',
    nullable: false,
  })
  current_activity_id: string;
}
