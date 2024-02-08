import { Entity, JoinColumn, Column, ManyToOne, Index } from 'typeorm';
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

  @Index()
  @Column({ type: 'varchar' })
  user_id: string;

  @Index()
  @Column({ type: 'varchar' })
  course_id: string;

  @ManyToOne(() => User, (user) => user.id, { onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @ManyToOne(() => Course, (course) => course.id, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course?: Course;
}
