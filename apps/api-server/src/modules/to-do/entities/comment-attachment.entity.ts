import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { User } from '../../user/entities/user.entity';
import { TaskComment } from './task-comment.entity';

@Entity('comment_attachments')
export class CommentAttachment extends BaseEntity {
  constructor({ id, ...data }: Partial<CommentAttachment> = {}, options = { generateId: false }) {
    super(id, options);
    Object.assign(this, { ...data });
  }

  @Index()
  @Column({
    type: 'uuid',
    nullable: false,
  })
  comment_id: string;

  @Index()
  @Column({
    type: 'uuid',
    nullable: false,
  })
  user_id: string;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: false,
  })
  file_name: string;

  @Column({
    type: 'varchar',
    length: 1000,
    nullable: false,
  })
  file_key: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: false,
  })
  content_type: string;

  @Column({
    type: 'bigint',
    nullable: false,
  })
  file_size: number;

  @ManyToOne(() => TaskComment, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'comment_id' })
  comment?: TaskComment;

  @ManyToOne(() => User, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;
}
