import { Entity, Column, ManyToOne, JoinColumn, ManyToMany, Index } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { User } from '../../user/entities/user.entity';
import { FocusMode } from './focus-mode.entity';
import { FocusModeTemplate } from '../../focus-mode-template/entities/focus-mode-template.entity';
import { CompletedFocusBlock } from './completed-focus-block.entity';

@Entity('focus_mode_tags')
export class FocusModeTag extends BaseEntity {
  constructor({ id, ...data }: Partial<FocusModeTag> = {}, options = { generateId: false }) {
    super(id, options);
    Object.assign(this, { ...data });
  }

  @Index()
  @Column({ type: 'uuid', nullable: false })
  user_id: string;

  @Column({ type: 'varchar', default: null })
  text: string;

  @ManyToOne(() => User, (user) => user.focus_modes, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @ManyToMany(() => FocusMode, (focusMode) => focusMode.tags)
  focusModes: FocusMode[];

  @ManyToMany(() => FocusModeTemplate, (focusModeTemplate) => focusModeTemplate.tags)
  focusModeTemplates: FocusModeTemplate[];

  @ManyToMany(() => FocusModeTemplate, (completedFocusBlock) => completedFocusBlock.tags)
  completedFocusBlocks: CompletedFocusBlock[];
}
