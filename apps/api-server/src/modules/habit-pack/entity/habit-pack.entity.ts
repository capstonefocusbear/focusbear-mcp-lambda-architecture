import { Column, DeleteDateColumn, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { ColumnNumericTransformer } from '../../../shared/transformers/numeric-column-transformer';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { User } from '../../user/entities/user.entity';
import { InstalledPack } from './installed-pack.entity';
import { ActivityTemplate } from '../../activity-template/entity/activity-template.entity';
import { HabitPackType } from '../domain/habit-pack-type.enum';
import { MarketplaceRequestType } from '../domain/marketplace-request.enum';
import { ActivitySequence } from '../../activity/entities/activity-sequence.entity';

@Entity('habit_packs')
export class HabitPack extends BaseEntity {
  constructor({ id, ...pack }: Partial<HabitPack> = {}, options = { generateId: false }) {
    super(id, options);
    Object.assign(this, { ...pack });
  }

  @Column({
    type: 'uuid',
    nullable: false,
  })
  user_id?: string;

  @Column({
    type: 'varchar',
  })
  pack_type?: HabitPackType;

  @Column({
    type: 'varchar',
  })
  pack_name?: string;

  @Column({
    type: 'varchar',
  })
  creator_name?: string;

  @Column({
    type: 'varchar',
  })
  description?: string;

  @Column({
    type: 'varchar',
  })
  description_video_url?: string;

  @Column({
    type: 'varchar',
  })
  welcome_message?: string;

  @Column({
    type: 'varchar',
  })
  welcome_video_url?: string;

  @Column({
    type: 'varchar',
    default: null,
  })
  description_plain_text?: string;

  @Column({
    type: 'varchar',
    default: null,
  })
  welcome_message_plain_text?: string;

  @Column({
    type: 'boolean',
    default: false,
  })
  marketplace_approval_status?: boolean;

  @Column({
    type: 'boolean',
    default: MarketplaceRequestType.unrequested,
  })
  marketplace_request?: MarketplaceRequestType;

  @Column({
    type: 'boolean',
    default: false,
  })
  is_featured?: boolean;

  @Column({
    type: 'boolean',
    default: false,
  })
  featured_for_onboarding?: boolean;

  @Column({
    type: 'varchar',
  })
  language?: string;

  @Column({
    type: 'numeric',
    default: 0,
    transformer: new ColumnNumericTransformer(),
  })
  morning_routine_duration_seconds?: number;

  @Column({
    type: 'numeric',
    default: 0,
    transformer: new ColumnNumericTransformer(),
  })
  evening_routine_duration_seconds?: number;

  @Column({
    type: 'numeric',
    transformer: new ColumnNumericTransformer(),
  })
  duration?: number;

  @Column({
    type: 'boolean',
    default: false,
  })
  breaks_only?: boolean;

  @DeleteDateColumn()
  deleted_at?: Date;

  @OneToMany(() => InstalledPack, (installed_pack) => installed_pack.habit_pack)
  installs?: InstalledPack[];

  @OneToMany(() => ActivitySequence, (activity_sequence) => activity_sequence.habit_pack)
  activity_sequences?: ActivitySequence[];

  @OneToMany(() => ActivityTemplate, (activity_template) => activity_template.habit_pack)
  activity_templates?: ActivityTemplate[];

  @OneToMany(() => User, (user) => user.sign_up_habit_pack)
  signed_up_users?: User[];

  @ManyToOne(() => User, (user) => user.created_habit_packs, { onDelete: 'NO ACTION', onUpdate: 'NO ACTION' })
  @JoinColumn({ name: 'user_id' })
  user?: User;
}
