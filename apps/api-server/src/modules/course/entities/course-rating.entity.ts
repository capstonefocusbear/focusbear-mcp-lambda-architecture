import { Column, Entity, JoinColumn, ManyToOne, OneToOne, Index } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { Course } from './course.entity';
import { User } from '../../user/entities/user.entity';
import { Lesson } from '../../lesson/entities/lesson.entity';

@Entity('course_ratings')
export class CourseRating extends BaseEntity {
  constructor({ id, ...data }: Partial<CourseRating> = {}, options = { generateId: false }) {
    super(id, options);
    Object.assign(this, { ...data });
  }

  @Index()
  @Column({ type: 'varchar' })
  user_id: string;

  @Index()
  @Column({ type: 'varchar' })
  course_id: string;

  @Index()
  @Column({ type: 'varchar' })
  lesson_id?: string;

  @Column({ type: 'smallint' })
  rating: number;

  @Column({ type: 'varchar', length: 500 })
  review?: string;

  @OneToOne(() => Course, (course) => course.id)
  @JoinColumn({ name: 'course_id' })
  course?: Course;

  @ManyToOne(() => User, (user) => user.id, { onDelete: 'NO ACTION', onUpdate: 'NO ACTION' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @ManyToOne(() => Lesson, (lesson) => lesson.id)
  @JoinColumn({ name: 'lesson_id' })
  lesson?: Lesson;
}
