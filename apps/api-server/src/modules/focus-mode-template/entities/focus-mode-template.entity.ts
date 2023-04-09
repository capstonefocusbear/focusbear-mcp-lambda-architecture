import { Column, DeleteDateColumn, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { FocusMode } from '../../focus-mode/entities/focus-mode.entity';
import { MarketplaceRequestType } from '../../habit-pack/domain/marketplace-request.enum';
import { User } from '../../user/entities/user.entity';
import { InstalledFocusModeTemplate } from './installed-focus-mode_templates.entity';

@Entity('focus_mode_templates')
export class FocusModeTemplate extends BaseEntity {
  constructor({ id, ...data }: Partial<FocusModeTemplate> = {}, options = { generateId: false }) {
    super(id, options);
    Object.assign(this, { ...data });
  }

  @Column({
    type: 'uuid',
    nullable: false,
  })
  author_id?: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  author_name?: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  name?: string;

  @Column({
    type: 'jsonb',
    transformer: BaseEntity.encryptJSONField('allowed_apps'),
  })
  allowed_apps?: string[];

  @Column({
    type: 'jsonb',
    transformer: BaseEntity.encryptJSONField('allowed_urls'),
  })
  allowed_urls?: string[];

  @Column({
    type: 'varchar',
    length: 2500,
  })
  description?: string;

  @Column({
    type: 'varchar',
  })
  description_video_url?: string;

  @Column({
    type: 'varchar',
    length: 2500,
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

  @DeleteDateColumn()
  deleted_at?: Date;

  @ManyToOne(() => User, (user) => user.focus_mode_templates, { onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'author_id' })
  author?: User;

  @OneToMany(() => InstalledFocusModeTemplate, (installed_focus_mode) => installed_focus_mode.focus_mode_template)
  installs?: InstalledFocusModeTemplate[];

  @OneToMany(() => FocusMode, (focus_mode) => focus_mode.focus_mode_template)
  focus_modes?: FocusMode[];
}
