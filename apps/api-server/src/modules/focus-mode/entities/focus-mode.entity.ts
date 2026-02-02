import {
  Column,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  Index,
  JoinTable,
  ManyToMany,
} from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { FocusModeTemplate } from '../../focus-mode-template/entities/focus-mode-template.entity';
import { User } from '../../user/entities/user.entity';
import { CompletedFocusBlock } from './completed-focus-block.entity';
import { FocusModeTag } from './focus-mode-tags';
import { ToDo } from '../../to-do/entities/to-do.entity';
import { BlockingSchedule } from './blocking-schedule.entity';

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
    length: 512,
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

  @Column({
    type: 'boolean',
    default: true,
  })
  is_ai_enabled?: boolean;

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
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'focus_mode_template_id' })
  focus_mode_template?: FocusModeTemplate;

  @OneToMany(() => CompletedFocusBlock, (log) => log.focus_mode)
  completed_logs?: CompletedFocusBlock[];

  @OneToMany(() => ToDo, (to_do) => to_do.focus_mode)
  to_dos?: ToDo[];

  @ManyToMany(() => FocusModeTag, { cascade: true, eager: true })
  @JoinTable()
  tags?: FocusModeTag[];

  @OneToMany(() => BlockingSchedule, (blocking_schedule) => blocking_schedule.focus_mode)
  blocking_schedules?: BlockingSchedule[];
}
