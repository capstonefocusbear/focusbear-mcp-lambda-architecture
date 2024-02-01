import { Entity, Column, JoinColumn, ManyToOne, Index } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { Course } from '../../course/entities/course.entity';
import { Lesson } from './lesson.entity';
import { User } from '../../user/entities/user.entity';
import { LessonCompletionStatus } from '../domain/lesson-completion-status.enum';

@Entity('lesson-completions')
export class LessonCompletion extends BaseEntity {
  constructor({ id, ...data }: Partial<LessonCompletion> = {}, options = { generateId: false }) {
    super(id, options);
    Object.assign(this, { ...data });
  }

  @Column({ type: 'enum', enum: LessonCompletionStatus, default: LessonCompletionStatus.TUTORIAL })
  status: LessonCompletionStatus;

  @Index()
  @Column({ type: 'varchar' })
  lesson_id: string;

  @Index()
  @Column({ type: 'varchar' })
  course_id: string;

  @Index()
  @Column({ type: 'varchar' })
  user_id: string;

  @ManyToOne(() => Lesson, (lesson) => lesson.id)
  @JoinColumn({ name: 'lesson_id' })
  lesson?: Lesson;

  @ManyToOne(() => Course, (course) => course.id)
  @JoinColumn({ name: 'course_id' })
  course?: Course;

  @ManyToOne(() => User, (user) => user.id)
  @JoinColumn({ name: 'user_id' })
  user?: User;
}
