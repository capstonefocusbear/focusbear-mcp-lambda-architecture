import { Column, Entity, Index, ManyToMany } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { Note } from './note.entity';

@Entity('note_tags')
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
