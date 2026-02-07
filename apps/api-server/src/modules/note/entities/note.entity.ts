import { Column, Entity, Index, JoinColumn, JoinTable, ManyToMany, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { User } from '../../user/entities/user.entity';
import { CompletedActivity } from '../../activity/entities/completed-activity.entity';
import { NoteTag } from './note-tag.entity';
import { ToDo } from '../../to-do/entities/to-do.entity';

@Entity('notes')
export class Note extends BaseEntity {
  constructor({ id, ...note }: Partial<Note> = {}, options = { generateId: false }) {
    super(id, options);
    Object.assign(this, { ...note });
  }

  @Index()
  @Column({
    type: 'uuid',
    nullable: false,
  })
  user_id?: string;

  @Column({
    type: 'text',
    nullable: false,
    transformer: BaseEntity.encryptField('note_title'),
  })
  title: string;

  @Column({
    type: 'text',
    nullable: true,
    transformer: BaseEntity.encryptField('note_body'),
  })
  body?: string;

  @Index()
  @Column({
    type: 'uuid',
    nullable: true,
  })
  completed_activity_id?: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @ManyToOne(() => CompletedActivity, { onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'completed_activity_id' })
  completed_activity?: CompletedActivity;

  @ManyToMany(() => NoteTag, (tag) => tag.notes, { cascade: true, eager: true })
  @JoinTable({
    name: 'notes_tags',
    joinColumn: { name: 'note_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tag_id', referencedColumnName: 'id' },
  })
  tags?: NoteTag[];

  @ManyToMany(() => ToDo, { cascade: false })
  @JoinTable({
    name: 'notes_todos',
    joinColumn: { name: 'note_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'todo_id', referencedColumnName: 'id' },
  })
  embedded_todos?: ToDo[];
}
