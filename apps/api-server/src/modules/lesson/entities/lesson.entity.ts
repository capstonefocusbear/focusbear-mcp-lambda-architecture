import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { CourseRating } from '../../course/entities/course-rating.entity';
import { Course } from '../../course/entities/course.entity';

@Entity('lessons')
export class Lesson extends BaseEntity {
  constructor({ id, ...data }: Partial<Lesson> = {}, options = { generateId: false }) {
    super(id, options);
    Object.assign(this, { ...data });
  }

  @Column({ type: 'varchar' })
  course_id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'varchar', length: 2000 })
  content: string;

  @Column({ type: 'text' })
  url: string;

  @ManyToOne(() => Course, (course) => course.id)
  @JoinColumn({ name: 'course_id' })
  course?: Course;

  @OneToMany(() => CourseRating, (rating) => rating.lesson)
  ratings?: CourseRating[];
}
