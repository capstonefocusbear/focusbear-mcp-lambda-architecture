import { Column, ManyToOne, OneToMany, JoinColumn, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { Lesson } from '../../lesson/entities/lesson.entity';
import { CourseRating } from './course-rating.entity';
import { User } from '../../user/entities/user.entity';
import { LessonCompletion } from '../../lesson/entities/lesson-completion.entity';
import { CourseEnrolment } from './course-enrolment.enitiy';

@Entity('courses')
export class Course extends BaseEntity {
  constructor({ id, ...data }: Partial<Course> = {}, options = { generateId: false }) {
    super(id, options);
    Object.assign(this, { ...data });
  }

  @Index()
  @Column({ type: 'varchar' })
  author_id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  description: string;

  @Column({ type: 'boolean', default: false })
  is_hidden: boolean;

  @Column({ type: 'boolean', default: false })
  deleted: boolean;

  @ManyToOne(() => User, (user) => user.id, { onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'author_id' })
  author?: User;

  @OneToMany(() => LessonCompletion, (lesson_completion) => lesson_completion.course)
  lessonCompletions?: LessonCompletion[];

  @OneToMany(() => Lesson, (lesson) => lesson.course)
  lessons?: Lesson[];

  @OneToMany(() => CourseRating, (courseRating) => courseRating.course)
  ratings?: CourseRating[];

  @OneToMany(() => CourseEnrolment, (course_enrolment) => course_enrolment.course)
  enrollments?: CourseEnrolment[];
}
