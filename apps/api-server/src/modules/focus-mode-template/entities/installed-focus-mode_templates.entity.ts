import { Column, Entity, JoinColumn, ManyToOne, Index } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { User } from '../../user/entities/user.entity';
import { FocusModeTemplate } from './focus-mode-template.entity';

@Entity('installed_focus_mode_templates')
export class InstalledFocusModeTemplate extends BaseEntity {
  constructor({ id, ...installData }: Partial<InstalledFocusModeTemplate> = {}, options = { generateId: false }) {
    super(id, options);
    Object.assign(this, { ...installData });
  }

  @Index()
  @Column({
    type: 'uuid',
    nullable: false,
  })
  user_id?: string;

  @Index()
  @Column({
    type: 'uuid',
    nullable: false,
  })
  focus_mode_template_id?: string;

  @Column({
    type: 'boolean',
    default: false,
  })
  installation_status?: boolean;

  @ManyToOne(() => User, (user) => user.installed_focus_modes, { onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @ManyToOne(() => FocusModeTemplate, (focus_mode_template) => focus_mode_template.installs, {
    onDelete: 'NO ACTION',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'focus_mode_template_id' })
  focus_mode_template?: FocusModeTemplate;
}
