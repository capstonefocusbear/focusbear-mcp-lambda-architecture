import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity.entity';
import { User } from '../../user/entities/user.entity';
import { Project } from './project.entity';
import { ProjectMemberRole } from '../domain/project-member-role.enum';
import { ProjectMemberInvitationStatus } from '../domain/project-member-invitation-status.enum';

@Entity('project_members')
export class ProjectMember extends BaseEntity {
  constructor({ id, ...data }: Partial<ProjectMember> = {}, options = { generateId: false }) {
    super(id, options);
    Object.assign(this, { ...data });
  }

  @Index()
  @Column({
    type: 'uuid',
    nullable: false,
  })
  project_id: string;

  @Index()
  @Column({
    type: 'uuid',
    nullable: true,
  })
  user_id?: string;

  @Index()
  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    transformer: BaseEntity.encryptField('email'),
  })
  email?: string;

  @Column({
    type: 'enum',
    enum: ProjectMemberRole,
    default: ProjectMemberRole.MEMBER,
  })
  role: ProjectMemberRole;

  @Column({
    type: 'enum',
    enum: ProjectMemberInvitationStatus,
    default: ProjectMemberInvitationStatus.PENDING,
  })
  invitation_status: ProjectMemberInvitationStatus;

  @Column({
    type: 'timestamptz',
    nullable: true,
    default: () => 'CURRENT_TIMESTAMP',
  })
  invitation_sent_at?: Date;

  @Column({
    type: 'timestamptz',
    nullable: true,
  })
  invitation_responded_at?: Date;

  @ManyToOne(() => Project, (project) => project.members, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project?: Project;

  @ManyToOne(() => User, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;
}
