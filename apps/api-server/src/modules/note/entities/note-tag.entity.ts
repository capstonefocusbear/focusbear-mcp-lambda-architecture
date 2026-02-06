import { Column, Entity, Index, JoinColumn, ManyToMany, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { User } from '../../user/entities/user.entity';
import { Note } from './note.entity';

@Entity('note_tags')
@Unique('UQ_note_tags_user_id_text', ['user_id', 'text'])
export class NoteTag extends BaseEntity {
  constructor({ id, ...tag }: Partial<NoteTag> = {}, options = { generateId: false }) {
    super(id, options);
    Object.assign(this, { ...tag });
  }

  @Index()
  @Column({
    type: 'uuid',
    nullable: false,
  })
  user_id?: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  text: string;

  @Column({
    type: 'varchar',
    length: 7,
    nullable: true,
    default: '#808080',
  })
  color?: string;

  @ManyToMany(() => Note, (note) => note.tags)
  notes?: Note[];
}
