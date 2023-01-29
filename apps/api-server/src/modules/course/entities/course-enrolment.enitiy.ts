import { Entity, JoinColumn, Column, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { Course } from './course.entity';
import { User } from '../../user/entities/user.entity';

@Entity('course_enrolments')
export class CourseEnrolment extends BaseEntity {
  constructor({ id, ...data }: Partial<CourseEnrolment> = {}, options = { generateId: false }) {
    super(id, options);
    Object.assign(this, { ...data });
  }

  @Column({ type: 'boolean', default: false })
  finished: boolean;

  @Column({ type: 'varchar' })
  user_id: string;

  @Column({ type: 'varchar' })
  course_id: string;

  @ManyToOne(() => User, (user) => user.id)
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @ManyToOne(() => Course, (course) => course.id)
  @JoinColumn({ name: 'course_id' })
  course?: Course;
}
