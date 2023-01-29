import { Entity, Column, JoinColumn, ManyToOne } from 'typeorm';
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

  @Column({ type: 'varchar' })
  lesson_id: string;

  @Column({ type: 'varchar' })
  course_id: string;

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
