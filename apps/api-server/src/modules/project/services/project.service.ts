import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ProjectRepository } from '../repositories/project.repository';
import { ProjectMemberRepository } from '../repositories/project-member.repository';
import { Project } from '../entities/project.entity';
import { ProjectMember } from '../entities/project-member.entity';
import { CreateProjectDto } from '../dto/create-project.dto';
import { UpdateProjectDto } from '../dto/update-project.dto';
import { InviteProjectMemberDto } from '../dto/invite-project-member.dto';
import { UpdateProjectMemberDto } from '../dto/update-project-member.dto';
import { ProjectMemberRole } from '../domain/project-member-role.enum';
import { ProjectMemberInvitationStatus } from '../domain/project-member-invitation-status.enum';
import { DEFAULT_PROJECT_STATUSES } from '../domain/project-status.model';
import { ProjectResponseDto } from '../dto/project-response.dto';
import { ProjectListResponseDto } from '../dto/project-list-response.dto';
import { ProjectMemberResponseDto } from '../dto/project-member-response.dto';

@Injectable()
export class ProjectService {
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly projectMemberRepository: ProjectMemberRepository,
  ) {}

  async createProject(userId: string, dto: CreateProjectDto): Promise<ProjectResponseDto> {
    const project = new Project(
      {
        owner_id: userId,
        name: dto.name,
        description: dto.description,
        custom_statuses: dto.custom_statuses || DEFAULT_PROJECT_STATUSES,
      },
      { generateId: true },
    );

    const savedProject = await this.projectRepository.orm.save(project);

    // Add owner as a member with OWNER role
    const ownerMember = new ProjectMember(
      {
        project_id: savedProject.id,
        user_id: userId,
        role: ProjectMemberRole.OWNER,
        invitation_status: ProjectMemberInvitationStatus.ACCEPTED,
        invitation_responded_at: new Date(),
      },
      { generateId: true },
    );

    await this.projectMemberRepository.orm.save(ownerMember);

    return this.mapProjectToResponse(savedProject);
  }

  async getUserProjects(userId: string): Promise<ProjectListResponseDto> {
    const projects = await this.projectRepository.getAllUserProjects(userId);
    return {
      projects: projects.map((p) => this.mapProjectToResponse(p)),
      total_count: projects.length,
    };
  }

  async getProjectById(userId: string, projectId: string): Promise<ProjectResponseDto> {
    const project = await this.projectRepository.getProjectWithTaskCount(projectId);

    if (!project) {
      throw new NotFoundException(`Project with id ${projectId} not found`);
    }

    // Check if user has access to this project
    const hasAccess = await this.userHasAccessToProject(userId, project);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this project');
    }

    return this.mapProjectToResponse(project, project.task_count);
  }

  async updateProject(userId: string, projectId: string, dto: UpdateProjectDto): Promise<ProjectResponseDto> {
    const project = await this.projectRepository.getProjectById(projectId);

    if (!project) {
      throw new NotFoundException(`Project with id ${projectId} not found`);
    }

    const hasAdminAccess = await this.userHasAdminAccess(userId, project);
    if (!hasAdminAccess) {
      throw new ForbiddenException('You do not have permission to update this project');
    }

    const updatedProject = await this.projectRepository.update(projectId, {
      ...dto,
    });

    return this.mapProjectToResponse(updatedProject);
  }

  async deleteProject(userId: string, projectId: string): Promise<void> {
    const project = await this.projectRepository.getProjectById(projectId);

    if (!project) {
      throw new NotFoundException(`Project with id ${projectId} not found`);
    }

    // Only owner can delete the project
    if (project.owner_id !== userId) {
      throw new ForbiddenException('Only the project owner can delete this project');
    }

    await this.projectRepository.softDelete(projectId);
  }

  async inviteMember(
    userId: string,
    projectId: string,
    dto: InviteProjectMemberDto,
  ): Promise<ProjectMemberResponseDto> {
    const project = await this.projectRepository.getProjectById(projectId);

    if (!project) {
      throw new NotFoundException(`Project with id ${projectId} not found`);
    }

    const hasAdminAccess = await this.userHasAdminAccess(userId, project);
    if (!hasAdminAccess) {
      throw new ForbiddenException('You do not have permission to invite members to this project');
    }

    // Prevent inviting with owner role
    if (dto.role === ProjectMemberRole.OWNER) {
      throw new BadRequestException('Cannot invite a member with owner role');
    }

    // Check if member already exists
    const existingMember = await this.projectMemberRepository.getMemberByProjectAndEmail(projectId, dto.email);
    if (existingMember) {
      throw new BadRequestException('This email has already been invited to the project');
    }

    const member = new ProjectMember(
      {
        project_id: projectId,
        email: dto.email,
        role: dto.role || ProjectMemberRole.MEMBER,
        invitation_status: ProjectMemberInvitationStatus.PENDING,
        invitation_sent_at: new Date(),
      },
      { generateId: true },
    );

    const savedMember = await this.projectMemberRepository.orm.save(member);

    // TODO: Send invitation email using SendGrid integration

    return this.mapMemberToResponse(savedMember);
  }

  async removeMember(userId: string, projectId: string, memberId: string): Promise<void> {
    const project = await this.projectRepository.getProjectById(projectId);

    if (!project) {
      throw new NotFoundException(`Project with id ${projectId} not found`);
    }

    const member = await this.projectMemberRepository.orm.findOne({ where: { id: memberId } });

    if (!member || member.project_id !== projectId) {
      throw new NotFoundException(`Member with id ${memberId} not found in this project`);
    }

    // Cannot remove the owner
    if (member.role === ProjectMemberRole.OWNER) {
      throw new BadRequestException('Cannot remove the project owner');
    }

    // Check if user has admin access or is removing themselves
    const hasAdminAccess = await this.userHasAdminAccess(userId, project);
    const isRemovingSelf = member.user_id === userId;

    if (!hasAdminAccess && !isRemovingSelf) {
      throw new ForbiddenException('You do not have permission to remove members from this project');
    }

    await this.projectMemberRepository.removeMember(memberId);
  }

  async updateMemberRole(
    userId: string,
    projectId: string,
    memberId: string,
    dto: UpdateProjectMemberDto,
  ): Promise<ProjectMemberResponseDto> {
    const project = await this.projectRepository.getProjectById(projectId);

    if (!project) {
      throw new NotFoundException(`Project with id ${projectId} not found`);
    }

    const member = await this.projectMemberRepository.orm.findOne({ where: { id: memberId } });

    if (!member || member.project_id !== projectId) {
      throw new NotFoundException(`Member with id ${memberId} not found in this project`);
    }

    // Cannot change owner role
    if (member.role === ProjectMemberRole.OWNER) {
      throw new BadRequestException('Cannot change the role of the project owner');
    }

    // Cannot set someone as owner
    if (dto.role === ProjectMemberRole.OWNER) {
      throw new BadRequestException('Cannot assign owner role to a member');
    }

    const hasAdminAccess = await this.userHasAdminAccess(userId, project);
    if (!hasAdminAccess) {
      throw new ForbiddenException('You do not have permission to update member roles');
    }

    const updatedMember = await this.projectMemberRepository.update(memberId, {
      role: dto.role,
    });

    return this.mapMemberToResponse(updatedMember);
  }

  async acceptInvitation(userId: string, projectId: string, userEmail?: string): Promise<ProjectMemberResponseDto> {
    // First try to find by user_id (already linked)
    let member = await this.projectMemberRepository.getMemberByProjectAndUser(projectId, userId);

    // If not found by user_id, try by email as fallback (invitation may not be linked yet)
    if (!member && userEmail) {
      member = await this.projectMemberRepository.getMemberByProjectAndEmail(projectId, userEmail);
      if (member) {
        // Link the user to this invitation
        await this.projectMemberRepository.linkUserToInvitation(member.id, userId);
      }
    }

    if (!member) {
      throw new NotFoundException('No invitation found for this project');
    }

    if (member.invitation_status !== ProjectMemberInvitationStatus.PENDING) {
      throw new BadRequestException('This invitation has already been responded to');
    }

    const updatedMember = await this.projectMemberRepository.acceptInvitation(member.id);

    return this.mapMemberToResponse(updatedMember);
  }

  async declineInvitation(userId: string, projectId: string, userEmail?: string): Promise<void> {
    // First try to find by user_id (already linked)
    let member = await this.projectMemberRepository.getMemberByProjectAndUser(projectId, userId);

    // If not found by user_id, try by email as fallback
    if (!member && userEmail) {
      member = await this.projectMemberRepository.getMemberByProjectAndEmail(projectId, userEmail);
      if (member) {
        await this.projectMemberRepository.linkUserToInvitation(member.id, userId);
      }
    }

    if (!member) {
      throw new NotFoundException('No invitation found for this project');
    }

    if (member.invitation_status !== ProjectMemberInvitationStatus.PENDING) {
      throw new BadRequestException('This invitation has already been responded to');
    }

    await this.projectMemberRepository.declineInvitation(member.id);
  }

  async linkUserToInvitations(userId: string, email: string): Promise<void> {
    const pendingInvitations = await this.projectMemberRepository.getPendingInvitationsForEmail(email);

    await Promise.all(
      pendingInvitations.map((invitation) => this.projectMemberRepository.linkUserToInvitation(invitation.id, userId)),
    );
  }

  async getPendingInvitations(userId: string): Promise<ProjectResponseDto[]> {
    const pendingInvitations = await this.projectMemberRepository.getPendingInvitationsForUser(userId);
    return pendingInvitations
      .filter((invitation) => invitation.project)
      .map((invitation) => this.mapProjectToResponse(invitation.project));
  }

  private async userHasAccessToProject(userId: string, project: Project): Promise<boolean> {
    if (!project) {
      return false;
    }

    if (project.owner_id === userId) {
      return true;
    }

    const member = await this.projectMemberRepository.getMemberByProjectAndUser(project.id, userId);
    return member?.invitation_status === ProjectMemberInvitationStatus.ACCEPTED;
  }

  private async userHasAdminAccess(userId: string, project: Project): Promise<boolean> {
    if (!project) {
      return false;
    }

    if (project.owner_id === userId) {
      return true;
    }

    const member = await this.projectMemberRepository.getMemberByProjectAndUser(project.id, userId);
    return (
      member?.invitation_status === ProjectMemberInvitationStatus.ACCEPTED &&
      (member.role === ProjectMemberRole.OWNER || member.role === ProjectMemberRole.ADMIN)
    );
  }

  private mapProjectToResponse(project: Project, taskCount?: number): ProjectResponseDto {
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      owner_id: project.owner_id,
      custom_statuses: project.custom_statuses,
      members: project.members?.map((m) => this.mapMemberToResponse(m)),
      task_count: taskCount,
      created_at: project.created_at,
      updated_at: project.updated_at,
    };
  }

  private mapMemberToResponse(member: ProjectMember): ProjectMemberResponseDto {
    return {
      id: member.id,
      user_id: member.user_id,
      email: member.email,
      role: member.role,
      invitation_status: member.invitation_status,
      invitation_sent_at: member.invitation_sent_at,
      invitation_responded_at: member.invitation_responded_at,
      created_at: member.created_at,
      updated_at: member.updated_at,
    };
  }
}
