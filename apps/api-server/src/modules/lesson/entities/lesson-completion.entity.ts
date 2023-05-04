import { Entity, Column, JoinColumn, ManyToOne, Index } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { Course } from '../../course/entities/course.entity';
import { Lesson } from './lesson.entity';
import { User } from '../../user/entities/user.entity';

@Entity('lesson_completions')
export class LessonCompletion extends BaseEntity {
  constructor({ id, ...data }: Partial<LessonCompletion> = {}, options = { generateId: false }) {
    super(id, options);
    Object.assign(this, { ...data });
  }

  @Index()
  @Column({ type: 'varchar' })
  lesson_id: string;

  @Index()
  @Column({ type: 'varchar' })
  course_id: string;

  @Index()
  @Column({ type: 'varchar' })
  user_id: string;

  @ManyToOne(() => Lesson, (lesson) => lesson.id, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'lesson_id' })
  lesson?: Lesson;

  @ManyToOne(() => Course, (course) => course.id, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course?: Course;

  @ManyToOne(() => User, (user) => user.id, { onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;
}
