import { setSeederFactory } from 'typeorm-extension';
import { Faker } from '@faker-js/faker';
import { ProjectMember } from '../modules/project/entities/project-member.entity';
import { ProjectMemberRole } from '../modules/project/domain/project-member-role.enum';
import { ProjectMemberInvitationStatus } from '../modules/project/domain/project-member-invitation-status.enum';

export const ProjectMemberFactory = setSeederFactory(ProjectMember, (faker: Faker) => {
  const now = new Date();
  const invitationStatus = faker.helpers.arrayElement([
    ProjectMemberInvitationStatus.PENDING,
    ProjectMemberInvitationStatus.ACCEPTED,
    ProjectMemberInvitationStatus.DECLINED,
  ]);

  const member = new ProjectMember(
    {
      email: faker.datatype.boolean({ probability: 0.5 }) ? faker.internet.email() : undefined,
      role: faker.helpers.arrayElement([ProjectMemberRole.ADMIN, ProjectMemberRole.MEMBER]),
      invitation_status: invitationStatus,
      invitation_sent_at: invitationStatus === ProjectMemberInvitationStatus.PENDING ? now : undefined,
      invitation_responded_at:
        invitationStatus !== ProjectMemberInvitationStatus.PENDING
          ? new Date(now.getTime() - faker.number.int({ min: 1, max: 7 }) * 24 * 60 * 60 * 1000)
          : undefined,
    },
    { generateId: true },
  );

  return member;
});
