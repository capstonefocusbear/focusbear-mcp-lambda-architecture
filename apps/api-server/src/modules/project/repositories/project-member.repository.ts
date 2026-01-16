import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { ProjectMember } from '../entities/project-member.entity';
import { ProjectMemberInvitationStatus } from '../domain/project-member-invitation-status.enum';

@Injectable()
export class ProjectMemberRepository extends BaseRepository<ProjectMember> {
  constructor(private readonly dataSource: DataSource) {
    super(dataSource, ProjectMember);
  }

  async getProjectMembers(projectId: string): Promise<ProjectMember[]> {
    return this.orm.find({
      where: { project_id: projectId },
      relations: ['user'],
      order: { created_at: 'ASC' },
    });
  }

  async getMemberByProjectAndUser(projectId: string, userId: string): Promise<ProjectMember | null> {
    return this.orm.findOne({
      where: { project_id: projectId, user_id: userId },
    });
  }

  async getMemberByProjectAndEmail(projectId: string, email: string): Promise<ProjectMember | null> {
    return this.orm.findOne({
      where: { project_id: projectId, email },
    });
  }

  async getPendingInvitationsForUser(userId: string): Promise<ProjectMember[]> {
    return this.orm.find({
      where: { user_id: userId, invitation_status: ProjectMemberInvitationStatus.PENDING },
      relations: ['project', 'project.owner'],
    });
  }

  async getPendingInvitationsForEmail(email: string): Promise<ProjectMember[]> {
    return this.orm.find({
      where: { email, invitation_status: ProjectMemberInvitationStatus.PENDING },
      relations: ['project', 'project.owner'],
    });
  }

  async acceptInvitation(memberId: string): Promise<ProjectMember> {
    await this.orm.update(memberId, {
      invitation_status: ProjectMemberInvitationStatus.ACCEPTED,
      invitation_responded_at: new Date(),
    });
    return this.orm.findOne({ where: { id: memberId } });
  }

  async declineInvitation(memberId: string): Promise<void> {
    await this.orm.update(memberId, {
      invitation_status: ProjectMemberInvitationStatus.DECLINED,
      invitation_responded_at: new Date(),
    });
  }

  async removeMember(memberId: string): Promise<void> {
    await this.orm.delete(memberId);
  }

  async linkUserToInvitation(memberId: string, userId: string): Promise<void> {
    await this.orm.update(memberId, { user_id: userId });
  }
}
