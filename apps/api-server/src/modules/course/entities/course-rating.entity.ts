import { Column, Entity, JoinColumn, ManyToOne, OneToOne, Index, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { Course } from './course.entity';
import { User } from '../../user/entities/user.entity';

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

  @Column({ type: 'smallint' })
  rating: number;

  @Column({ type: 'varchar', length: 500 })
  review?: string;

  @ManyToOne(() => Course, (course) => course.id)
  @JoinColumn({ name: 'course_id' })
  course?: Course;

  @ManyToOne(() => User, (user) => user.id, { onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;
}
