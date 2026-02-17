import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { User } from '../../user/entities/user.entity';
import { TaskComment } from './task-comment.entity';

@Entity('task_comment_reactions')
@Unique(['comment_id', 'user_id', 'emoji'])
export class TaskCommentReaction extends BaseEntity {
  constructor({ id, ...data }: Partial<TaskCommentReaction> = {}, options = { generateId: false }) {
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
    length: 10,
    nullable: false,
  })
  emoji: string;

  @ManyToOne(() => TaskComment, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'comment_id' })
  comment?: TaskComment;

  @ManyToOne(() => User, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;
}
