import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';
import { Project } from '../modules/project/entities/project.entity';
import { ProjectMember } from '../modules/project/entities/project-member.entity';
import { ProjectMemberRole } from '../modules/project/domain/project-member-role.enum';
import { ProjectMemberInvitationStatus } from '../modules/project/domain/project-member-invitation-status.enum';
import { TEST_USER_ID } from './seeding-constant';
import { User } from '../modules/user/entities/user.entity';

export class ProjectsSeeder implements Seeder {
  public async run(dataSource: DataSource, factoryManager: SeederFactoryManager): Promise<void> {
    const projectFactory = factoryManager.get(Project);
    const projectMemberFactory = factoryManager.get(ProjectMember);
    const userFactory = factoryManager.get(User);

    // Create projects owned by TEST_USER_ID - for pagination testing
    // We'll create 25 projects to test pagination (default take=20, so we need more than one page)
    const ownedProjectsPromises = Array.from({ length: 25 }, async (_, i) => {
      const project = await projectFactory.save({
        owner_id: TEST_USER_ID,
        name: `Owned Project ${i + 1}`,
        description: i % 3 === 0 ? `Description for owned project ${i + 1}` : undefined,
        custom_statuses:
          i % 5 === 0
            ? [
                { id: 'custom-backlog', label: 'Backlog', color: '#9CA3AF', order: 0, should_complete_task: false },
                { id: 'custom-todo', label: 'To Do', color: '#6B7280', order: 1, should_complete_task: false },
                {
                  id: 'custom-in-progress',
                  label: 'In Progress',
                  color: '#3B82F6',
                  order: 2,
                  should_complete_task: false,
                },
                { id: 'custom-done', label: 'Done', color: '#10B981', order: 3, should_complete_task: true },
              ]
            : undefined,
      });

      // Add owner as a member with OWNER role (this is done automatically in service, but for seeding we do it manually)
      await projectMemberFactory.save({
        project_id: project.id,
        user_id: TEST_USER_ID,
        role: ProjectMemberRole.OWNER,
        invitation_status: ProjectMemberInvitationStatus.ACCEPTED,
        invitation_responded_at: new Date(),
      });

      return project;
    });

    await Promise.all(ownedProjectsPromises);

    // Create projects where TEST_USER_ID is a member (not owner) - to test the combined query
    // Create 10 projects owned by other users where TEST_USER_ID is a member
    const memberProjectOwners = await userFactory.saveMany(10);
    const memberProjectsPromises = Array.from({ length: 10 }, async (_, i) => {
      const otherUserId = memberProjectOwners[i].id;
      const project = await projectFactory.save({
        owner_id: otherUserId,
        name: `Member Project ${i + 1}`,
        description: `Project where test user is a member ${i + 1}`,
      });

      // Add owner as member
      await projectMemberFactory.save({
        project_id: project.id,
        user_id: otherUserId,
        role: ProjectMemberRole.OWNER,
        invitation_status: ProjectMemberInvitationStatus.ACCEPTED,
        invitation_responded_at: new Date(),
      });

      // Add TEST_USER_ID as a member with different roles and statuses
      const memberRole = i % 3 === 0 ? ProjectMemberRole.ADMIN : ProjectMemberRole.MEMBER;
      let memberStatus: ProjectMemberInvitationStatus;
      if (i % 4 === 0) {
        memberStatus = ProjectMemberInvitationStatus.PENDING;
      } else if (i % 4 === 1) {
        memberStatus = ProjectMemberInvitationStatus.DECLINED;
      } else {
        memberStatus = ProjectMemberInvitationStatus.ACCEPTED;
      }

      await projectMemberFactory.save({
        project_id: project.id,
        user_id: TEST_USER_ID,
        role: memberRole,
        invitation_status: memberStatus,
        invitation_sent_at: new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000),
        invitation_responded_at:
          memberStatus !== ProjectMemberInvitationStatus.PENDING
            ? new Date(Date.now() - i * 24 * 60 * 60 * 1000)
            : undefined,
      });

      return project;
    });

    await Promise.all(memberProjectsPromises);

    // Create projects with pending invitations (email-based, not linked to user yet)
    // These should NOT appear in getUserProjects since they're not accepted
    const pendingInvitationOwners = await userFactory.saveMany(5);
    const pendingInvitationPromises = Array.from({ length: 5 }, async (_, i) => {
      const otherUserId = pendingInvitationOwners[i].id;
      const project = await projectFactory.save({
        owner_id: otherUserId,
        name: `Pending Invitation Project ${i + 1}`,
      });

      // Add owner as member
      await projectMemberFactory.save({
        project_id: project.id,
        user_id: otherUserId,
        role: ProjectMemberRole.OWNER,
        invitation_status: ProjectMemberInvitationStatus.ACCEPTED,
        invitation_responded_at: new Date(),
      });

      // Add pending invitation for TEST_USER_ID by email (not linked yet)
      await projectMemberFactory.save({
        project_id: project.id,
        email: 'testuser@example.com', // This would match TEST_USER_ID's email if linked
        role: ProjectMemberRole.MEMBER,
        invitation_status: ProjectMemberInvitationStatus.PENDING,
        invitation_sent_at: new Date(),
      });

      return project;
    });

    await Promise.all(pendingInvitationPromises);

    // Create a few projects with multiple members to test member relationships
    const multiMemberProjectOwners = await userFactory.saveMany(3);
    const multiMemberProjectsPromises = Array.from({ length: 3 }, async (_, i) => {
      const otherUserId = multiMemberProjectOwners[i].id;
      const project = await projectFactory.save({
        owner_id: otherUserId,
        name: `Multi-Member Project ${i + 1}`,
        description: 'Project with multiple members including test user',
      });

      // Add owner
      await projectMemberFactory.save({
        project_id: project.id,
        user_id: otherUserId,
        role: ProjectMemberRole.OWNER,
        invitation_status: ProjectMemberInvitationStatus.ACCEPTED,
        invitation_responded_at: new Date(),
      });

      // Add TEST_USER_ID as accepted member
      await projectMemberFactory.save({
        project_id: project.id,
        user_id: TEST_USER_ID,
        role: i === 0 ? ProjectMemberRole.ADMIN : ProjectMemberRole.MEMBER,
        invitation_status: ProjectMemberInvitationStatus.ACCEPTED,
        invitation_responded_at: new Date(),
      });

      // Add some other members
      const extraMembers = await userFactory.saveMany(2);
      const otherMembersPromises = extraMembers.map(async (extraMember) => {
        await projectMemberFactory.save({
          project_id: project.id,
          user_id: extraMember.id,
          role: ProjectMemberRole.MEMBER,
          invitation_status: ProjectMemberInvitationStatus.ACCEPTED,
          invitation_responded_at: new Date(),
        });
      });

      await Promise.all(otherMembersPromises);

      return project;
    });

    await Promise.all(multiMemberProjectsPromises);
  }
}
