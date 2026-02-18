import { Test } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ProjectService } from './project.service';
import { ProjectRepository } from '../repositories/project.repository';
import { ProjectMemberRepository } from '../repositories/project-member.repository';
import { ProjectMemberRole } from '../domain/project-member-role.enum';
import { ProjectMemberInvitationStatus } from '../domain/project-member-invitation-status.enum';
import { DEFAULT_PROJECT_STATUSES } from '../domain/project-status.model';
import { GetProjectsQueryDto } from '../dto/get-projects-query.dto';
import { PageOrder } from '../../../shared/domain/page-order.enum';

const ProjectRepositoryMock = {
  orm: {
    save: jest.fn(),
    findOne: jest.fn(),
    softDelete: jest.fn(),
  },
  getProjectById: jest.fn(),
  getProjectWithTaskCount: jest.fn(),
  getAllUserProjects: jest.fn(),
  softDelete: jest.fn(),
  update: jest.fn(),
};

const ProjectMemberRepositoryMock = {
  orm: {
    save: jest.fn(),
    findOne: jest.fn(),
  },
  getMemberByProjectAndUser: jest.fn(),
  getMemberByProjectAndEmail: jest.fn(),
  getPendingInvitationsForEmail: jest.fn(),
  getPendingInvitationsForUser: jest.fn(),
  linkUserToInvitation: jest.fn(),
  acceptInvitation: jest.fn(),
  declineInvitation: jest.fn(),
  removeMember: jest.fn(),
  update: jest.fn(),
};

describe('ProjectService', () => {
  let projectService: ProjectService;

  const userDummy = {
    id: randomUUID(),
    email: 'test@example.com',
  };

  const projectDummy = {
    id: randomUUID(),
    name: 'Test Project',
    description: 'Test Description',
    owner_id: userDummy.id,
    custom_statuses: DEFAULT_PROJECT_STATUSES,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const memberDummy = {
    id: randomUUID(),
    project_id: projectDummy.id,
    user_id: userDummy.id,
    role: ProjectMemberRole.OWNER,
    invitation_status: ProjectMemberInvitationStatus.ACCEPTED,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [ProjectService, ProjectRepository, ProjectMemberRepository],
    })
      .overrideProvider(ProjectRepository)
      .useValue(ProjectRepositoryMock)
      .overrideProvider(ProjectMemberRepository)
      .useValue(ProjectMemberRepositoryMock)
      .compile();

    projectService = moduleRef.get<ProjectService>(ProjectService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(projectService).toBeDefined();
  });

  describe('createProject', () => {
    it('positive: should create a new project with default statuses', async () => {
      ProjectRepositoryMock.orm.save.mockResolvedValueOnce(projectDummy);
      ProjectMemberRepositoryMock.orm.save.mockResolvedValueOnce(memberDummy);

      const result = await projectService.createProject(userDummy.id, {
        name: 'Test Project',
        description: 'Test Description',
      });

      expect(result.name).toBe('Test Project');
      expect(result.description).toBe('Test Description');
      expect(result.owner_id).toBe(userDummy.id);
      expect(ProjectRepositoryMock.orm.save).toHaveBeenCalled();
      expect(ProjectMemberRepositoryMock.orm.save).toHaveBeenCalled();
    });

    it('positive: should create a project with custom statuses', async () => {
      const customStatuses = [
        { id: '1', label: 'Open', color: '#ff0000', order: 0, should_complete_task: false },
        { id: '2', label: 'Closed', color: '#00ff00', order: 1, should_complete_task: true },
      ];
      const projectWithCustomStatuses = { ...projectDummy, custom_statuses: customStatuses };

      ProjectRepositoryMock.orm.save.mockResolvedValueOnce(projectWithCustomStatuses);
      ProjectMemberRepositoryMock.orm.save.mockResolvedValueOnce(memberDummy);

      const result = await projectService.createProject(userDummy.id, {
        name: 'Test Project',
        custom_statuses: customStatuses,
      });

      expect(result.custom_statuses).toEqual(customStatuses);
    });
  });

  describe('getUserProjects', () => {
    it('positive: should return all user projects', async () => {
      const queryDto: GetProjectsQueryDto = {
        page: 1,
        take: 20,
        skip: 0,
        order: PageOrder.DESC,
      };
      ProjectRepositoryMock.getAllUserProjects.mockResolvedValueOnce([[projectDummy], 1]);

      const result = await projectService.getUserProjects(userDummy.id, queryDto);

      expect(result.data).toHaveLength(1);
      expect(result.meta.itemCount).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.take).toBe(20);
      expect(result.meta.order).toBe(PageOrder.DESC);
      expect(result.data[0].name).toBe('Test Project');
      expect(result.projects).toHaveLength(1);
      expect(result.total_count).toBe(1);
    });

    it('positive: should return empty list when user has no projects', async () => {
      const queryDto: GetProjectsQueryDto = {
        page: 1,
        take: 20,
        skip: 0,
        order: PageOrder.DESC,
      };
      ProjectRepositoryMock.getAllUserProjects.mockResolvedValueOnce([[], 0]);

      const result = await projectService.getUserProjects(userDummy.id, queryDto);

      expect(result.data).toHaveLength(0);
      expect(result.meta.itemCount).toBe(0);
      expect(result.meta.page).toBe(1);
      expect(result.meta.take).toBe(20);
      expect(result.projects).toHaveLength(0);
      expect(result.total_count).toBe(0);
    });
  });

  describe('getProjectById', () => {
    it('positive: should return project when user has access', async () => {
      const projectWithTaskCount = { ...projectDummy, task_count: 5 };
      ProjectRepositoryMock.getProjectWithTaskCount.mockResolvedValueOnce(projectWithTaskCount);
      ProjectRepositoryMock.getProjectById.mockResolvedValueOnce(projectDummy);

      const result = await projectService.getProjectById(userDummy.id, projectDummy.id);

      expect(result.id).toBe(projectDummy.id);
      expect(result.task_count).toBe(5);
    });

    it('negative: should throw NotFoundException when project does not exist', async () => {
      ProjectRepositoryMock.getProjectWithTaskCount.mockResolvedValueOnce(null);

      await expect(projectService.getProjectById(userDummy.id, randomUUID())).rejects.toThrow(NotFoundException);
    });

    it('negative: should throw ForbiddenException when user has no access', async () => {
      const otherUserId = randomUUID();
      const otherProject = { ...projectDummy, owner_id: otherUserId };
      ProjectRepositoryMock.getProjectWithTaskCount.mockResolvedValueOnce(otherProject);
      ProjectRepositoryMock.getProjectById.mockResolvedValueOnce(otherProject);
      ProjectMemberRepositoryMock.getMemberByProjectAndUser.mockResolvedValueOnce(null);

      await expect(projectService.getProjectById(userDummy.id, otherProject.id)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateProject', () => {
    it('positive: should update project when user has admin access', async () => {
      const updatedProject = { ...projectDummy, name: 'Updated Name' };
      ProjectRepositoryMock.getProjectById.mockResolvedValueOnce(projectDummy);
      ProjectRepositoryMock.update.mockResolvedValueOnce(updatedProject);

      const result = await projectService.updateProject(userDummy.id, projectDummy.id, { name: 'Updated Name' });

      expect(result.name).toBe('Updated Name');
    });

    it('negative: should throw NotFoundException when project does not exist', async () => {
      ProjectRepositoryMock.getProjectById.mockResolvedValueOnce(null);

      await expect(projectService.updateProject(userDummy.id, randomUUID(), { name: 'New Name' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('negative: should throw ForbiddenException when user has no admin access', async () => {
      const otherUserId = randomUUID();
      const otherProject = { ...projectDummy, owner_id: otherUserId };
      ProjectRepositoryMock.getProjectById.mockResolvedValueOnce(otherProject);
      ProjectMemberRepositoryMock.getMemberByProjectAndUser.mockResolvedValueOnce(null);

      await expect(projectService.updateProject(userDummy.id, otherProject.id, { name: 'New Name' })).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('deleteProject', () => {
    it('positive: should delete project when user is owner', async () => {
      ProjectRepositoryMock.getProjectById.mockResolvedValueOnce(projectDummy);
      ProjectRepositoryMock.softDelete.mockResolvedValueOnce(undefined);

      await projectService.deleteProject(userDummy.id, projectDummy.id);

      expect(ProjectRepositoryMock.softDelete).toHaveBeenCalledWith(projectDummy.id);
    });

    it('negative: should throw NotFoundException when project does not exist', async () => {
      ProjectRepositoryMock.getProjectById.mockResolvedValueOnce(null);

      await expect(projectService.deleteProject(userDummy.id, randomUUID())).rejects.toThrow(NotFoundException);
    });

    it('negative: should throw ForbiddenException when user is not owner', async () => {
      const otherUserId = randomUUID();
      const otherProject = { ...projectDummy, owner_id: otherUserId };
      ProjectRepositoryMock.getProjectById.mockResolvedValueOnce(otherProject);

      await expect(projectService.deleteProject(userDummy.id, otherProject.id)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('inviteMember', () => {
    it('positive: should invite a new member', async () => {
      const newMember = {
        id: randomUUID(),
        project_id: projectDummy.id,
        email: 'newmember@example.com',
        role: ProjectMemberRole.MEMBER,
        invitation_status: ProjectMemberInvitationStatus.PENDING,
      };
      ProjectRepositoryMock.getProjectById.mockResolvedValueOnce(projectDummy);
      ProjectMemberRepositoryMock.getMemberByProjectAndEmail.mockResolvedValueOnce(null);
      ProjectMemberRepositoryMock.orm.save.mockResolvedValueOnce(newMember);

      const result = await projectService.inviteMember(userDummy.id, projectDummy.id, {
        email: 'newmember@example.com',
      });

      expect(result.email).toBe('newmember@example.com');
      expect(result.invitation_status).toBe(ProjectMemberInvitationStatus.PENDING);
    });

    it('negative: should throw BadRequestException when email already invited', async () => {
      ProjectRepositoryMock.getProjectById.mockResolvedValueOnce(projectDummy);
      ProjectMemberRepositoryMock.getMemberByProjectAndEmail.mockResolvedValueOnce(memberDummy);

      await expect(
        projectService.inviteMember(userDummy.id, projectDummy.id, { email: 'existing@example.com' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('negative: should throw BadRequestException when inviting with owner role', async () => {
      ProjectRepositoryMock.getProjectById.mockResolvedValueOnce(projectDummy);

      await expect(
        projectService.inviteMember(userDummy.id, projectDummy.id, {
          email: 'new@example.com',
          role: ProjectMemberRole.OWNER,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('negative: should throw ForbiddenException when user has no admin access', async () => {
      const otherUserId = randomUUID();
      const otherProject = { ...projectDummy, owner_id: otherUserId };
      ProjectRepositoryMock.getProjectById.mockResolvedValueOnce(otherProject);
      ProjectMemberRepositoryMock.getMemberByProjectAndUser.mockResolvedValueOnce(null);

      await expect(
        projectService.inviteMember(userDummy.id, otherProject.id, { email: 'new@example.com' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('removeMember', () => {
    it('positive: should remove a member when user has admin access', async () => {
      const memberToRemove = {
        ...memberDummy,
        id: randomUUID(),
        role: ProjectMemberRole.MEMBER,
        user_id: randomUUID(),
      };
      ProjectRepositoryMock.getProjectById.mockResolvedValueOnce(projectDummy);
      ProjectMemberRepositoryMock.orm.findOne.mockResolvedValueOnce(memberToRemove);
      ProjectMemberRepositoryMock.removeMember.mockResolvedValueOnce(undefined);

      await projectService.removeMember(userDummy.id, projectDummy.id, memberToRemove.id);

      expect(ProjectMemberRepositoryMock.removeMember).toHaveBeenCalledWith(memberToRemove.id);
    });

    it('positive: should allow member to remove themselves', async () => {
      const selfMember = {
        ...memberDummy,
        id: randomUUID(),
        role: ProjectMemberRole.MEMBER,
        user_id: userDummy.id,
      };
      const otherProject = { ...projectDummy, owner_id: randomUUID() };
      ProjectRepositoryMock.getProjectById.mockResolvedValueOnce(otherProject);
      ProjectMemberRepositoryMock.orm.findOne.mockResolvedValueOnce(selfMember);
      ProjectMemberRepositoryMock.getMemberByProjectAndUser.mockResolvedValueOnce(selfMember);
      ProjectMemberRepositoryMock.removeMember.mockResolvedValueOnce(undefined);

      await projectService.removeMember(userDummy.id, otherProject.id, selfMember.id);

      expect(ProjectMemberRepositoryMock.removeMember).toHaveBeenCalledWith(selfMember.id);
    });

    it('negative: should throw BadRequestException when trying to remove owner', async () => {
      const ownerMember = { ...memberDummy, role: ProjectMemberRole.OWNER };
      ProjectRepositoryMock.getProjectById.mockResolvedValueOnce(projectDummy);
      ProjectMemberRepositoryMock.orm.findOne.mockResolvedValueOnce(ownerMember);

      await expect(projectService.removeMember(userDummy.id, projectDummy.id, ownerMember.id)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('negative: should throw NotFoundException when member not found', async () => {
      ProjectRepositoryMock.getProjectById.mockResolvedValueOnce(projectDummy);
      ProjectMemberRepositoryMock.orm.findOne.mockResolvedValueOnce(null);

      await expect(projectService.removeMember(userDummy.id, projectDummy.id, randomUUID())).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateMemberRole', () => {
    it('positive: should update member role', async () => {
      const memberToUpdate = {
        ...memberDummy,
        id: randomUUID(),
        role: ProjectMemberRole.MEMBER,
        user_id: randomUUID(),
      };
      const updatedMember = { ...memberToUpdate, role: ProjectMemberRole.ADMIN };
      ProjectRepositoryMock.getProjectById.mockResolvedValueOnce(projectDummy);
      ProjectMemberRepositoryMock.orm.findOne.mockResolvedValueOnce(memberToUpdate);
      ProjectMemberRepositoryMock.update.mockResolvedValueOnce(updatedMember);

      const result = await projectService.updateMemberRole(userDummy.id, projectDummy.id, memberToUpdate.id, {
        role: ProjectMemberRole.ADMIN,
      });

      expect(result.role).toBe(ProjectMemberRole.ADMIN);
    });

    it('negative: should throw BadRequestException when trying to change owner role', async () => {
      const ownerMember = { ...memberDummy, role: ProjectMemberRole.OWNER };
      ProjectRepositoryMock.getProjectById.mockResolvedValueOnce(projectDummy);
      ProjectMemberRepositoryMock.orm.findOne.mockResolvedValueOnce(ownerMember);

      await expect(
        projectService.updateMemberRole(userDummy.id, projectDummy.id, ownerMember.id, {
          role: ProjectMemberRole.ADMIN,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('negative: should throw BadRequestException when trying to assign owner role', async () => {
      const memberToUpdate = {
        ...memberDummy,
        id: randomUUID(),
        role: ProjectMemberRole.MEMBER,
      };
      ProjectRepositoryMock.getProjectById.mockResolvedValueOnce(projectDummy);
      ProjectMemberRepositoryMock.orm.findOne.mockResolvedValueOnce(memberToUpdate);

      await expect(
        projectService.updateMemberRole(userDummy.id, projectDummy.id, memberToUpdate.id, {
          role: ProjectMemberRole.OWNER,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('acceptInvitation', () => {
    it('positive: should accept pending invitation', async () => {
      const pendingMember = {
        ...memberDummy,
        id: randomUUID(),
        invitation_status: ProjectMemberInvitationStatus.PENDING,
      };
      const acceptedMember = {
        ...pendingMember,
        invitation_status: ProjectMemberInvitationStatus.ACCEPTED,
      };
      ProjectMemberRepositoryMock.getMemberByProjectAndUser.mockResolvedValueOnce(pendingMember);
      ProjectMemberRepositoryMock.acceptInvitation.mockResolvedValueOnce(acceptedMember);

      const result = await projectService.acceptInvitation(userDummy.id, projectDummy.id);

      expect(result.invitation_status).toBe(ProjectMemberInvitationStatus.ACCEPTED);
    });

    it('negative: should throw NotFoundException when no invitation found', async () => {
      ProjectMemberRepositoryMock.getMemberByProjectAndUser.mockResolvedValueOnce(null);

      await expect(projectService.acceptInvitation(userDummy.id, projectDummy.id)).rejects.toThrow(NotFoundException);
    });

    it('negative: should throw BadRequestException when invitation already responded', async () => {
      const acceptedMember = {
        ...memberDummy,
        invitation_status: ProjectMemberInvitationStatus.ACCEPTED,
      };
      ProjectMemberRepositoryMock.getMemberByProjectAndUser.mockResolvedValueOnce(acceptedMember);

      await expect(projectService.acceptInvitation(userDummy.id, projectDummy.id)).rejects.toThrow(BadRequestException);
    });
  });

  describe('declineInvitation', () => {
    it('positive: should decline pending invitation', async () => {
      const pendingMember = {
        ...memberDummy,
        id: randomUUID(),
        invitation_status: ProjectMemberInvitationStatus.PENDING,
      };
      ProjectMemberRepositoryMock.getMemberByProjectAndUser.mockResolvedValueOnce(pendingMember);
      ProjectMemberRepositoryMock.declineInvitation.mockResolvedValueOnce(undefined);

      await projectService.declineInvitation(userDummy.id, projectDummy.id);

      expect(ProjectMemberRepositoryMock.declineInvitation).toHaveBeenCalledWith(pendingMember.id);
    });

    it('negative: should throw NotFoundException when no invitation found', async () => {
      ProjectMemberRepositoryMock.getMemberByProjectAndUser.mockResolvedValueOnce(null);

      await expect(projectService.declineInvitation(userDummy.id, projectDummy.id)).rejects.toThrow(NotFoundException);
    });

    it('negative: should throw BadRequestException when invitation already responded', async () => {
      const declinedMember = {
        ...memberDummy,
        invitation_status: ProjectMemberInvitationStatus.DECLINED,
      };
      ProjectMemberRepositoryMock.getMemberByProjectAndUser.mockResolvedValueOnce(declinedMember);

      await expect(projectService.declineInvitation(userDummy.id, projectDummy.id)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('linkUserToInvitations', () => {
    it('positive: should link user to pending invitations', async () => {
      const pendingInvitations = [
        { id: randomUUID(), email: userDummy.email },
        { id: randomUUID(), email: userDummy.email },
      ];
      ProjectMemberRepositoryMock.getPendingInvitationsForEmail.mockResolvedValueOnce(pendingInvitations);
      ProjectMemberRepositoryMock.linkUserToInvitation.mockResolvedValue(undefined);

      await projectService.linkUserToInvitations(userDummy.id, userDummy.email);

      expect(ProjectMemberRepositoryMock.linkUserToInvitation).toHaveBeenCalledTimes(2);
    });

    it('positive: should handle no pending invitations', async () => {
      ProjectMemberRepositoryMock.getPendingInvitationsForEmail.mockResolvedValueOnce([]);

      await projectService.linkUserToInvitations(userDummy.id, userDummy.email);

      expect(ProjectMemberRepositoryMock.linkUserToInvitation).not.toHaveBeenCalled();
    });
  });

  describe('getPendingInvitations', () => {
    it('positive: should return pending invitations for user', async () => {
      const pendingInvitations = [
        { id: randomUUID(), user_id: userDummy.id, project: projectDummy },
        { id: randomUUID(), user_id: userDummy.id, project: { ...projectDummy, id: randomUUID(), name: 'Project 2' } },
      ];
      ProjectMemberRepositoryMock.getPendingInvitationsForUser.mockResolvedValueOnce(pendingInvitations);

      const result = await projectService.getPendingInvitations(userDummy.id);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Test Project');
      expect(result[1].name).toBe('Project 2');
    });

    it('positive: should return empty array when no pending invitations', async () => {
      ProjectMemberRepositoryMock.getPendingInvitationsForUser.mockResolvedValueOnce([]);

      const result = await projectService.getPendingInvitations(userDummy.id);

      expect(result).toHaveLength(0);
    });

    it('positive: should filter out invitations without project', async () => {
      const pendingInvitations = [
        { id: randomUUID(), user_id: userDummy.id, project: projectDummy },
        { id: randomUUID(), user_id: userDummy.id, project: null },
      ];
      ProjectMemberRepositoryMock.getPendingInvitationsForUser.mockResolvedValueOnce(pendingInvitations);

      const result = await projectService.getPendingInvitations(userDummy.id);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Test Project');
    });
  });
});
