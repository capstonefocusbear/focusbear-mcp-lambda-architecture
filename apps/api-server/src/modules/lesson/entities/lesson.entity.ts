import { Column, Entity, JoinColumn, ManyToOne, OneToMany, Index } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { CourseRating } from '../../course/entities/course-rating.entity';
import { Course } from '../../course/entities/course.entity';
import { LessonCompletion } from './lesson-completion.entity';

@Entity('lessons')
export class Lesson extends BaseEntity {
  constructor({ id, ...data }: Partial<Lesson> = {}, options = { generateId: false }) {
    super(id, options);
    Object.assign(this, { ...data });
  }

  @Index()
  @Column({ type: 'varchar' })
  course_id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'varchar', length: 2000 })
  content: string;

  @Column({ type: 'text' })
  url: string;

  @Column({ type: 'varchar' })
  lesson_completion_id: string;

  @ManyToOne(() => Course, (course) => course.id, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course?: Course;

  @OneToMany(() => CourseRating, (rating) => rating.lesson, { onDelete: 'NO ACTION', onUpdate: 'NO ACTION' })
  ratings?: CourseRating[];

  @OneToMany(() => LessonCompletion, (completion) => completion.lesson, {
    onDelete: 'NO ACTION',
    onUpdate: 'CASCADE',
  })
  lesson_completions?: LessonCompletion[];
}
