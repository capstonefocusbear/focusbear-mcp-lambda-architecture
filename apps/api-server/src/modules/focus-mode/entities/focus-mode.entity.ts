import { Column, DeleteDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, Index } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { FocusModeTemplate } from '../../focus-mode-template/entities/focus-mode-template.entity';
import { User } from '../../user/entities/user.entity';
import { CompletedFocusBlock } from './completed-focus-block.entity';

@Entity('focus_modes')
export class FocusMode extends BaseEntity {
  constructor({ id, ...data }: Partial<FocusMode> = {}, options = { generateId: false }) {
    super(id, options);
    Object.assign(this, { ...data });
  }

  @Index()
  @Column({
    type: 'uuid',
    nullable: false,
  })
  user_id?: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: false,
    transformer: BaseEntity.encryptField('name'),
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
    type: 'jsonb',
    transformer: BaseEntity.encryptJSONField('metadata'),
  })
  metadata?: any;

  @Index()
  @Column({
    type: 'uuid',
  })
  focus_mode_template_id?: string;

  @DeleteDateColumn()
  deleted_at?: Date;

  @ManyToOne(() => User, (user) => user.focus_modes, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @ManyToOne(() => FocusModeTemplate, (focus_mode_template) => focus_mode_template.focus_modes, {
    onDelete: 'NO ACTION',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'focus_mode_template_id' })
  focus_mode_template?: FocusModeTemplate;

  @OneToMany(() => CompletedFocusBlock, (log) => log.focus_mode)
  completed_logs?: CompletedFocusBlock[];
}
