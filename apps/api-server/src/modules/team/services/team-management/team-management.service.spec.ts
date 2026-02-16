import { RevenueCatService } from '@app/revenue-cat';
import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { SENTRY_TOKEN } from '@app/observability';
import { SendGridService } from '@app/send-grid';
import { JwtService } from '@app/jwt';
import { StripeService } from '@app/stripe';
import { Auth0ManagementService } from '@app/auth0';
import {
  auth0UserDummy,
  DailyStatsDummy,
  TeamMemberDummy,
  TeamMemberFake,
  TeamWithMembersDummy,
  userDummy,
} from '../../../../../test/dummies';
import {
  JwtServiceMock,
  RevenueCatServiceMock,
  SendGridServiceMock,
  SentryServiceMock,
  TeamRepositoryMock,
  UserRepositoryMock,
  Auth0ManagementServiceMock,
  StripeServiceMock,
  ConfigServiceMock,
  TeamToMemberRepositoryMock,
  TeamToAdminRepositoryMock,
  UserDailyStatsServiceMock,
  DailyStatsRepositoryMock,
  DeviceServiceMock,
  TeamJoinCodeRepositoryMock,
} from '../../../../../test/mocks';
import { UserRepository } from '../../../user/repositories/user.repository';
import { TeamRepository } from '../../repositories/team.repository';
import { DailyStatsRepository } from '../../../user/repositories/user-daily-stats.repository';
import { TeamManagementService } from './team-management.service';
import { EMAIL_TEMPLATE_IDS, FOCUS_BEAR_EMAILS } from '../../../../shared/utils/constants';
import { Entitlement } from '../../../subscription/domain/entitlement.enum';
import { Team } from '../../entities/team.entity';
import { TeamToMemberRepository } from '../../repositories/team-to-member.repository';
import { TeamToAdminRepository } from '../../repositories/team-to-admin.repository';
import { TeamJoinCodeRepository } from '../../repositories/team-join-code.repository';
import { TeamToAdmin } from '../../entities/team-to-admin.entity';
import { PaymentType } from '../../domain/payment-type.enum';
import { UserDailyStatsService } from '../../../user/services/user-daily-stats/user-daily-stats.service';
import { DeviceService } from '../../../device/services/device/device.service';
import { InvitationStatus } from '../../domain/invitation-status.enum';
import { TeamToMember } from '../../entities/team-to-member.entity';

describe('TeamManagementService', () => {
  let teamManagementService: TeamManagementService;
  process.env = { JWT_INVITATION_SECRET: 'test-secret' };
  const adminId = randomUUID();
  const newUser = { ...userDummy, id: randomUUID() };
  const auth0NewUserEmail = 'authNewUserEmail@email.com';
  const origin = 'https://dashboard.local.dev:3000';

  const teamToAdminDummy = new TeamToAdmin({
    id: randomUUID(),
    admin_id: adminId,
    team_id: TeamWithMembersDummy.id,
  });

  const teamToAdminTeamMemberDummy = new TeamToAdmin({
    id: randomUUID(),
    admin_id: TeamMemberDummy.member_id,
    team_id: TeamWithMembersDummy.id,
  });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        UserRepository,
        TeamRepository,
        TeamManagementService,
        RevenueCatService,
        JwtService,
        SendGridService,
        ConfigService,
        Auth0ManagementService,
        StripeService,
        TeamToMemberRepository,
        TeamToAdminRepository,
        {
          provide: SENTRY_TOKEN,
          useValue: SentryServiceMock,
        },
        UserDailyStatsService,
        DailyStatsRepository,
        DeviceService,
        TeamJoinCodeRepository,
      ],
    })
      .overrideProvider(UserRepository)
      .useValue(UserRepositoryMock)
      .overrideProvider(TeamRepository)
      .useValue(TeamRepositoryMock)
      .overrideProvider(RevenueCatService)
      .useValue(RevenueCatServiceMock)
      .overrideProvider(JwtService)
      .useValue(JwtServiceMock)
      .overrideProvider(SendGridService)
      .useValue(SendGridServiceMock)
      .overrideProvider(Auth0ManagementService)
      .useValue(Auth0ManagementServiceMock)
      .overrideProvider(StripeService)
      .useValue(StripeServiceMock)
      .overrideProvider(ConfigService)
      .useValue(ConfigServiceMock)
      .overrideProvider(TeamToMemberRepository)
      .useValue(TeamToMemberRepositoryMock)
      .overrideProvider(TeamToAdminRepository)
      .useValue(TeamToAdminRepositoryMock)
      .overrideProvider(UserDailyStatsService)
      .useValue(UserDailyStatsServiceMock)
      .overrideProvider(DailyStatsRepository)
      .useValue(DailyStatsRepositoryMock)
      .overrideProvider(DeviceService)
      .useValue(DeviceServiceMock)
      .overrideProvider(TeamJoinCodeRepository)
      .useValue(TeamJoinCodeRepositoryMock)
      .compile();

    teamManagementService = moduleRef.get<TeamManagementService>(TeamManagementService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(teamManagementService).toBeDefined();
  });

  describe('bulkDeleteTeamMembers', () => {
    const teamId = TeamWithMembersDummy.id;
    it('negative: if team does not exist in DB, throw the NotFoundException', async () => {
      const owner_id = randomUUID();
      const member_ids = [randomUUID()];
      TeamRepositoryMock.orm.findOne.mockResolvedValue(null);
      let exception: any;

      try {
        await teamManagementService.bulkDeleteTeamMembers({ member_ids, team_id: teamId }, owner_id);
      } catch (error) {
        exception = error;
      }

      const errorMessage = `Team with id: ${teamId} doesn't exist!`;
      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: user should be disassociated from the team in the DB and the membership entitlement needs to be revoked via RevenueCat', async () => {
      const memberToDelete = TeamMemberDummy;
      const dummyTeam = {
        ...TeamWithMembersDummy,
        team_size: 2,
        team_size_limit: 10,
        payment_type: PaymentType.STRIPE,
      };

      TeamRepositoryMock.orm.findOne.mockResolvedValue(dummyTeam);
      TeamToMemberRepositoryMock.orm.find.mockResolvedValueOnce([memberToDelete]);

      TeamRepositoryMock.getTeamIncludingUnregistered.mockResolvedValue({
        team: dummyTeam,
        members: [memberToDelete, TeamMemberFake],
      });

      await teamManagementService.bulkDeleteTeamMembers(
        { member_ids: [memberToDelete.member_id], team_id: teamId },
        dummyTeam.owner_id,
      );

      expect(TeamToMemberRepositoryMock.orm.delete).toHaveBeenCalledWith({
        team_id: teamId,
        member_id: memberToDelete.member_id,
      });
      expect(RevenueCatServiceMock.revokeTeamMembership).toHaveBeenCalledWith(
        memberToDelete.id,
        Entitlement.team_member,
      );
      expect(StripeServiceMock.updateSubscription).toHaveBeenCalledWith(
        TeamWithMembersDummy.stripe_data.subscriptionId,
        TeamWithMembersDummy.stripe_data.subscriptionItemId,
        1,
      );
      expect(TeamRepositoryMock.update).toHaveBeenCalledWith(teamId, { team_size: 1 });
    });
  });

  describe('getMemberInsights', () => {
    it('positive: returns member details with devices', async () => {
      TeamRepositoryMock.orm.findOne.mockResolvedValue(TeamWithMembersDummy);
      TeamRepositoryMock.getTeamIncludingUnregistered.mockResolvedValueOnce({
        members: [TeamMemberDummy],
        admins: [{ admin_id: adminId }],
      });

      UserRepositoryMock.orm.findOne.mockResolvedValueOnce({
        id: TeamMemberDummy.member_id,
        morning_routines_streak: 1,
        evening_routines_streak: 2,
        focus_modes_streak: 3,
        morning_number_days_completed: 5,
        morning_num_days_of_stats: 7,
      });
      UserDailyStatsServiceMock.getLastNDaysDailyStats.mockResolvedValueOnce([]);

      DeviceServiceMock.getDevicesByUserId.mockResolvedValueOnce([
        {
          id: 'dev-1',
          operating_system: 'MacOS',
          app_version: '1.2.3',
          is_leader: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);

      const result = await teamManagementService.getMemberInsights(
        adminId,
        TeamWithMembersDummy.id,
        TeamMemberDummy.member_id,
      );

      expect(result.member.id).toBe(TeamMemberDummy.member_id);
      expect(result.devices.length).toBe(1);
      expect(DeviceServiceMock.getDevicesByUserId).toHaveBeenCalled();
    });
  });

  describe('inviteTeamMember', () => {
    const unregisteredNewMember = {
      team_id: TeamWithMembersDummy.id,
      member_id: null,
      first_name: auth0UserDummy.given_name,
      last_name: auth0UserDummy.family_name,
      member_expiry_date: TeamWithMembersDummy.expires_date,
      email: auth0NewUserEmail,
    };

    const inviteTeamMemberDtoDummy = {
      email: auth0NewUserEmail,
      team_id: TeamWithMembersDummy.id,
      first_name: auth0UserDummy.given_name,
      last_name: auth0UserDummy.family_name,
      member_expiry_date: TeamWithMembersDummy.expires_date as Date,
      is_admin: false,
      user_id: newUser.id,
    };

    it('negative: if either email or user not provided, throw the BadRequestException', async () => {
      TeamRepositoryMock.orm.findOne.mockResolvedValue(TeamWithMembersDummy);
      let exception;
      const errorMessage = 'Both email and user_id cannot be empty. Please provide either an email or a user_id.';

      try {
        await teamManagementService.inviteTeamMember(adminId, {
          ...inviteTeamMemberDtoDummy,
          email: undefined,
          user_id: undefined,
        });
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeInstanceOf(BadRequestException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('negative: if team does not exist in DB, throw the NotFoundException', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(newUser);
      Auth0ManagementServiceMock.getAuth0User.mockResolvedValueOnce({ ...auth0UserDummy, email: auth0NewUserEmail });
      TeamRepositoryMock.orm.findOne.mockResolvedValue(null);
      let exception: any;

      try {
        await teamManagementService.inviteTeamMember(adminId, inviteTeamMemberDtoDummy);
      } catch (error) {
        exception = error;
      }

      const errorMessage = `Team with id: ${inviteTeamMemberDtoDummy.team_id} doesn't exist!`;
      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('negative: if user is not admin member of team, throw the UnauthorizedException', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(newUser);
      Auth0ManagementServiceMock.getAuth0User.mockResolvedValueOnce({ ...auth0UserDummy, email: auth0NewUserEmail });
      TeamRepositoryMock.orm.findOne.mockResolvedValue(TeamWithMembersDummy);
      TeamRepositoryMock.getTeamIncludingUnregistered.mockResolvedValueOnce({
        members: [TeamMemberDummy, TeamMemberFake],
        admins: [teamToAdminTeamMemberDummy, teamToAdminDummy],
      });
      let exception: any;

      try {
        await teamManagementService.inviteTeamMember(userDummy.id, {
          ...inviteTeamMemberDtoDummy,
          user_id: TeamMemberDummy.member_id,
        });
      } catch (error) {
        exception = error;
      }

      const errorMessage = `User with id: ${userDummy.id} is not an admin member of this team!`;
      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(UnauthorizedException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('negative: if team payment_type is OFFLINE and capacity is full, throw the BadRequestException', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(newUser);
      Auth0ManagementServiceMock.getAuth0User.mockResolvedValueOnce({ ...auth0UserDummy, email: auth0NewUserEmail });
      TeamRepositoryMock.orm.findOne.mockResolvedValueOnce({
        ...TeamWithMembersDummy,
        payment_type: PaymentType.OFFLINE,
        team_size: 2,
        team_size_limit: 2,
      });
      TeamRepositoryMock.getTeamIncludingUnregistered.mockResolvedValueOnce({
        members: [TeamMemberDummy, TeamMemberFake],
        admins: [teamToAdminDummy],
      });

      let exception;
      const errorMessage = `Unable to invite more members to team with id: ${TeamWithMembersDummy.id}, maximum capacity reached!`;

      try {
        await teamManagementService.inviteTeamMember(adminId, inviteTeamMemberDtoDummy);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeInstanceOf(BadRequestException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('negative: if the user is already a member of the team, throw the BadRequestException', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      Auth0ManagementServiceMock.getAuth0User.mockResolvedValueOnce(auth0UserDummy);
      TeamRepositoryMock.orm.findOne.mockResolvedValue(TeamWithMembersDummy);
      TeamRepositoryMock.getTeamIncludingUnregistered.mockResolvedValueOnce({
        members: [TeamMemberDummy, TeamMemberFake],
        admins: [teamToAdminTeamMemberDummy, teamToAdminDummy],
      });
      let exception: any;

      try {
        await teamManagementService.inviteTeamMember(adminId, {
          ...inviteTeamMemberDtoDummy,
          user_id: TeamMemberDummy.member_id,
        });
      } catch (error) {
        exception = error;
      }

      const errorMessage = `User with id ${TeamMemberDummy.member_id} is already in team with id: ${inviteTeamMemberDtoDummy.team_id}`;
      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(BadRequestException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: jwt should be created with email and admin_id in payload', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(newUser);
      Auth0ManagementServiceMock.getAuth0User.mockResolvedValueOnce({ ...auth0UserDummy, email: auth0NewUserEmail });
      TeamRepositoryMock.orm.findOne.mockResolvedValueOnce({
        ...TeamWithMembersDummy,
        payment_type: PaymentType.OFFLINE,
        team_size: 2,
        team_size_limit: 5,
      });
      TeamRepositoryMock.getTeamIncludingUnregistered.mockResolvedValueOnce({
        members: [TeamMemberDummy, TeamMemberFake],
        admins: [teamToAdminDummy],
      });
      TeamToMemberRepositoryMock.orm.find.mockResolvedValueOnce([TeamMemberDummy, TeamMemberFake]);
      TeamToMemberRepositoryMock.orm.create.mockResolvedValueOnce(unregisteredNewMember);
      TeamToMemberRepositoryMock.orm.save.mockResolvedValueOnce((args) => args);
      ConfigServiceMock.get.mockReturnValueOnce('test-secret');

      await teamManagementService.inviteTeamMember(adminId, inviteTeamMemberDtoDummy);

      const { user_id, ...rest } = inviteTeamMemberDtoDummy;
      expect(JwtServiceMock.asyncSign).toHaveBeenCalledWith(
        {
          ...rest,
          admin_id: adminId,
          team_name: TeamWithMembersDummy.name,
        },
        'test-secret',
      );
    });

    it('positive: email should be sent with invitation link inside', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(newUser);
      Auth0ManagementServiceMock.getAuth0User.mockResolvedValueOnce({ ...auth0UserDummy, email: auth0NewUserEmail });
      TeamRepositoryMock.orm.findOne.mockResolvedValueOnce({
        ...TeamWithMembersDummy,
        payment_type: PaymentType.OFFLINE,
        team_size: 2,
        team_size_limit: 5,
      });
      TeamRepositoryMock.getTeamIncludingUnregistered.mockResolvedValueOnce({
        members: [TeamMemberDummy, TeamMemberFake],
        admins: [teamToAdminDummy],
      });
      TeamToMemberRepositoryMock.orm.find.mockResolvedValueOnce([TeamMemberDummy, TeamMemberFake]);
      TeamToMemberRepositoryMock.orm.create.mockResolvedValueOnce(unregisteredNewMember);
      TeamToMemberRepositoryMock.orm.save.mockResolvedValueOnce((args) => args);
      ConfigServiceMock.get.mockReturnValueOnce('test-secret').mockReturnValueOnce('https://dashboard.local.dev:3000');
      JwtServiceMock.asyncSign.mockResolvedValueOnce('nekot');

      await teamManagementService.inviteTeamMember(adminId, inviteTeamMemberDtoDummy, origin);

      expect(SendGridServiceMock.sendEmail).toHaveBeenCalledWith({
        to: unregisteredNewMember.email,
        from: FOCUS_BEAR_EMAILS.SUPPORT,
        templateId: EMAIL_TEMPLATE_IDS.TEAM_INVITE,
        dynamicTemplateData: {
          invite_url: expect.toInclude('https://dashboard.local.dev:3000/accept-invite?token=nekot'),
          team_name: TeamWithMembersDummy.name,
        },
        bcc: FOCUS_BEAR_EMAILS.ZOHO_DESK_SUPPORT,
      });
    });
  });

  // TODO: Implement unit tests for acceptInvitation function

  describe('assignExistingMemberAsAdmin', () => {
    it('negative: if team does not exist in DB, throw the NotFoundException', async () => {
      TeamRepositoryMock.orm.findOne.mockResolvedValue(null);
      let exception: any;

      try {
        await teamManagementService.assignExistingMemberAsAdmin(
          { member_id: TeamMemberDummy.member_id, team_id: TeamWithMembersDummy.id },
          userDummy.id,
        );
      } catch (error) {
        exception = error;
      }

      const errorMessage = `Team with id: ${TeamWithMembersDummy.id} doesn't exist!`;
      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('negative: if user is not admin member of team, throw the UnauthorizedException', async () => {
      TeamRepositoryMock.orm.findOne.mockResolvedValue(TeamWithMembersDummy);
      TeamRepositoryMock.getTeamIncludingUnregistered.mockResolvedValueOnce({
        members: [TeamMemberDummy, TeamMemberFake],
        admins: [teamToAdminDummy],
      });
      let exception: any;

      try {
        await teamManagementService.assignExistingMemberAsAdmin(
          { member_id: TeamMemberDummy.member_id, team_id: TeamWithMembersDummy.id },
          userDummy.id,
        );
      } catch (error) {
        exception = error;
      }
      const errorMessage = `User with id: ${userDummy.id} is not an admin member of this team!`;
      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(UnauthorizedException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('negative: if user is already admin member of team, error should be thrown', async () => {
      TeamRepositoryMock.orm.findOne.mockResolvedValue(TeamWithMembersDummy);
      TeamRepositoryMock.getTeamIncludingUnregistered.mockResolvedValueOnce({
        members: [TeamMemberDummy, TeamMemberFake],
        admins: [teamToAdminDummy, teamToAdminTeamMemberDummy],
      });
      let exception;
      const errorMessage = `User with id: ${TeamMemberDummy.member_id} is already an admin member of team with id: ${TeamWithMembersDummy.id}!`;

      try {
        await teamManagementService.assignExistingMemberAsAdmin(
          { member_id: TeamMemberDummy.member_id, team_id: TeamWithMembersDummy.id },
          adminId,
        );
      } catch (error) {
        exception = error;
      }

      expect(exception.message).toEqual(errorMessage);
      expect(exception).toBeInstanceOf(BadRequestException);
    });

    it('positive: member should be saved as admin and granted admin entitlement in RC', async () => {
      TeamRepositoryMock.orm.findOne.mockResolvedValue(TeamWithMembersDummy);
      TeamRepositoryMock.getTeamIncludingUnregistered.mockResolvedValueOnce({
        members: [TeamMemberDummy, TeamMemberFake],
        admins: [teamToAdminDummy],
      });

      await teamManagementService.assignExistingMemberAsAdmin(
        { member_id: TeamMemberDummy.member_id, team_id: TeamWithMembersDummy.id },
        adminId,
      );

      expect(TeamToAdminRepositoryMock.orm.save).toHaveBeenCalledWith(
        new TeamToAdmin({ team_id: TeamWithMembersDummy.id, admin_id: TeamMemberDummy.member_id }),
      );
      expect(RevenueCatServiceMock.grantTeamMembership).toHaveBeenCalledWith(
        TeamMemberDummy.member_id,
        Entitlement.team_admin,
        TeamMemberDummy.member_expiry_date,
      );
    });
  });

  describe('removeMember', () => {
    it('negative: if team does not exist in DB, throw the NotFoundException', async () => {
      TeamRepositoryMock.orm.findOne.mockResolvedValue(null);
      let exception: any;
      try {
        await teamManagementService.removeMember(
          { member_id: newUser.id, team_id: TeamWithMembersDummy.id },
          userDummy.id,
        );
      } catch (error) {
        exception = error;
      }

      const errorMessage = `Team with id: ${TeamWithMembersDummy.id} doesn't exist!`;
      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('negative: if user is not admin member of team, throw the UnauthorizedException', async () => {
      TeamRepositoryMock.orm.findOne.mockResolvedValue(TeamWithMembersDummy);
      TeamRepositoryMock.getTeamIncludingUnregistered.mockResolvedValueOnce({
        members: [TeamMemberDummy, TeamMemberFake],
        admins: [teamToAdminDummy],
      });
      let exception: any;

      try {
        await teamManagementService.removeMember(
          { member_id: newUser.id, team_id: TeamWithMembersDummy.id },
          userDummy.id,
        );
      } catch (error) {
        exception = error;
      }
      const errorMessage = `User with id: ${userDummy.id} is not an admin member of this team!`;
      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(UnauthorizedException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('negative: if user is not found in the team, throw BadRequestException', async () => {
      TeamRepositoryMock.orm.findOne.mockResolvedValue(TeamWithMembersDummy);
      TeamRepositoryMock.getTeamIncludingUnregistered.mockResolvedValueOnce({
        members: [TeamMemberDummy],
        admins: [teamToAdminDummy],
      });

      const errorMessage = `User with member_id: ${newUser.id} does not exist in the team (team_id: ${TeamWithMembersDummy.id}).`;
      let exception: any;

      try {
        await teamManagementService.removeMember({ member_id: newUser.id, team_id: TeamWithMembersDummy.id }, adminId);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(BadRequestException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: should remove member from the team and decrease team size', async () => {
      TeamRepositoryMock.orm.findOne.mockResolvedValue({ ...TeamWithMembersDummy, team_size: 2, team_size_limit: 5 });
      TeamRepositoryMock.getTeamIncludingUnregistered.mockResolvedValueOnce({
        members: [TeamMemberDummy, TeamMemberFake],
        admins: [teamToAdminDummy],
      });
      TeamToMemberRepositoryMock.orm.find.mockResolvedValueOnce([TeamWithMembersDummy]);

      await teamManagementService.removeMember(
        { member_id: TeamMemberDummy.member_id, team_id: TeamWithMembersDummy.id },
        adminId,
      );
      expect(TeamRepositoryMock.orm.delete).toHaveBeenCalledWith({
        team_id: TeamWithMembersDummy.id,
        member_id: TeamMemberDummy.member_id,
      });
      expect(TeamRepositoryMock.update).toHaveBeenCalledWith(TeamWithMembersDummy.id, { team_size: 1 });
    });

    it('positive: stripe subscription should be updated', async () => {
      TeamRepositoryMock.orm.findOne.mockResolvedValue({ ...TeamWithMembersDummy, team_size: 2, team_size_limit: 5 });
      TeamRepositoryMock.getTeamIncludingUnregistered.mockResolvedValueOnce({
        members: [TeamMemberDummy, TeamMemberFake],
        admins: [teamToAdminDummy],
      });
      TeamToMemberRepositoryMock.orm.find.mockResolvedValueOnce([TeamWithMembersDummy]);

      const {
        stripe_data: { subscriptionId, subscriptionItemId },
      } = TeamWithMembersDummy;

      await teamManagementService.removeMember(
        { member_id: TeamMemberDummy.member_id, team_id: TeamWithMembersDummy.id },
        adminId,
      );

      expect(StripeServiceMock.updateSubscription).toHaveBeenCalledWith(subscriptionId, subscriptionItemId, 1);
    });

    it('positive: if team payment_type if OFFLINE, team size should be updated in DB, but not in Stripe', async () => {
      TeamRepositoryMock.orm.findOne.mockResolvedValue({
        ...TeamWithMembersDummy,
        team_size: 2,
        team_size_limit: 5,
        payment_type: PaymentType.OFFLINE,
      });
      TeamRepositoryMock.getTeamIncludingUnregistered.mockResolvedValueOnce({
        members: [TeamMemberDummy, TeamMemberFake],
        admins: [teamToAdminDummy],
      });
      TeamToMemberRepositoryMock.orm.find.mockResolvedValueOnce([TeamWithMembersDummy]);

      await teamManagementService.removeMember(
        { member_id: TeamMemberDummy.member_id, team_id: TeamWithMembersDummy.id },
        adminId,
      );

      expect(TeamRepositoryMock.update).toHaveBeenCalledWith(TeamWithMembersDummy.id, { team_size: 1 });
      expect(StripeServiceMock.updateSubscription).not.toHaveBeenCalled();
    });
  });

  describe('removeMemberAsAdmin', () => {
    it('negative: if team does not exist in DB, throw the NotFoundException', async () => {
      TeamRepositoryMock.orm.findOne.mockResolvedValue(null);
      let exception: any;
      try {
        await teamManagementService.removeMemberAsAdmin(
          { member_id: TeamMemberDummy.member_id, team_id: TeamWithMembersDummy.id },
          userDummy.id,
        );
      } catch (error) {
        exception = error;
      }

      const errorMessage = `Team with id: ${TeamWithMembersDummy.id} doesn't exist!`;
      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('negative: if user is not admin member of team, throw the UnauthorizedException', async () => {
      TeamRepositoryMock.orm.findOne.mockResolvedValue(TeamWithMembersDummy);
      TeamRepositoryMock.getTeamIncludingUnregistered.mockResolvedValueOnce({
        members: [TeamMemberDummy, TeamMemberFake],
        admins: [teamToAdminDummy],
      });
      let exception: any;

      try {
        await teamManagementService.removeMemberAsAdmin(
          { member_id: TeamMemberDummy.member_id, team_id: TeamWithMembersDummy.id },
          userDummy.id,
        );
      } catch (error) {
        exception = error;
      }
      const errorMessage = `User with id: ${userDummy.id} is not an admin member of this team!`;
      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(UnauthorizedException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('negative: if user is not found in the team, throw BadRequestException', async () => {
      TeamRepositoryMock.orm.findOne.mockResolvedValue(TeamWithMembersDummy);
      TeamRepositoryMock.getTeamIncludingUnregistered.mockResolvedValueOnce({
        members: [TeamMemberFake],
        admins: [teamToAdminDummy],
      });

      const errorMessage = `User with member_id: ${TeamMemberDummy.member_id} does not exist in the team (team_id: ${TeamWithMembersDummy.id}).`;
      let exception: any;
      try {
        await teamManagementService.removeMemberAsAdmin(
          { member_id: TeamMemberDummy.member_id, team_id: TeamWithMembersDummy.id },
          adminId,
        );
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(BadRequestException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: member should be removed as admin and admin entitlement should be revoked in RC', async () => {
      const teamToAdminMemberDummy = new TeamToAdmin({
        id: randomUUID(),
        admin_id: TeamMemberDummy.member_id,
        team_id: TeamWithMembersDummy.id,
      });

      TeamRepositoryMock.orm.findOne.mockResolvedValue(TeamWithMembersDummy);
      TeamRepositoryMock.getTeamIncludingUnregistered.mockResolvedValueOnce({
        team: TeamWithMembersDummy,
        members: [TeamMemberDummy, TeamMemberFake],
        admins: [teamToAdminDummy, teamToAdminMemberDummy],
      });
      TeamToAdminRepositoryMock.orm.find.mockResolvedValue([
        teamToAdminMemberDummy,
        { ...teamToAdminMemberDummy, team_id: randomUUID(), id: randomUUID() },
      ]);

      await teamManagementService.removeMemberAsAdmin(
        { member_id: TeamMemberDummy.member_id, team_id: TeamWithMembersDummy.id },
        adminId,
      );

      expect(TeamToAdminRepositoryMock.orm.delete).toHaveBeenCalledWith({
        team_id: TeamWithMembersDummy.id,
        admin_id: TeamMemberDummy.member_id,
      });

      expect(RevenueCatServiceMock.revokeTeamMembership).toHaveBeenCalledWith(
        TeamMemberDummy.member_id,
        Entitlement.team_admin,
      );
    });
  });

  describe('registerTeam', () => {
    it('negative: should throw not found exception is user is not found in DB', async () => {
      const createSubscriptionPayloadDummy = {
        id: 'id',
        quantity: 5,
        customer: userDummy.stripe_customer_id,
        current_period_end: 1676874600,
        items: { data: [{ id: 'sub_id_1' }] },
      };
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(null);

      const errorMessage = `User with Stripe ID: ${userDummy.stripe_customer_id} does not exist!`;
      let exception: any;

      try {
        await teamManagementService.registerTeam(createSubscriptionPayloadDummy);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: should save new team in DB', async () => {
      const createSubscriptionPayloadDummy = {
        id: 'id',
        quantity: 5,
        customer: userDummy.stripe_customer_id,
        current_period_end: 1676874600,
        items: { data: [{ id: 'sub_id_1' }] },
        metadata: { team_name: 'Test Name' },
      };
      const newTeam = new Team({
        created_at: expect.toBeDateString(),
        updated_at: expect.toBeDateString(),
        owner_id: userDummy.id,
        stripe_subscription_id: 'id',
        stripe_data: {
          subscriptionId: createSubscriptionPayloadDummy.id,
          customerId: userDummy.stripe_customer_id,
          subscriptionItemId: createSubscriptionPayloadDummy.items.data[0].id,
        },
        team_size: 5,
        owner: userDummy,
        name: 'Test Name',
        expires_date: new Date(createSubscriptionPayloadDummy.current_period_end * 1000),
      });
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      TeamRepositoryMock.orm.save.mockResolvedValueOnce(newTeam);

      await teamManagementService.registerTeam(createSubscriptionPayloadDummy);

      expect(UserRepositoryMock.orm.save).toHaveBeenCalled();
    });
  });

  describe('updateTeamSize', () => {
    it('negative: if team does not exist in DB, throw the NotFoundException', async () => {
      TeamRepositoryMock.orm.findOne.mockResolvedValue(null);
      let exception: any;
      try {
        await teamManagementService.updateTeamSize(adminId, TeamWithMembersDummy.id, 3);
      } catch (error) {
        exception = error;
      }

      const errorMessage = `Team with id: ${TeamWithMembersDummy.id} doesn't exist!`;
      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('negative: if user is not admin member of team, throw the UnauthorizedException', async () => {
      TeamRepositoryMock.orm.findOne.mockResolvedValue(TeamWithMembersDummy);
      TeamRepositoryMock.getTeamIncludingUnregistered.mockResolvedValueOnce({
        members: [TeamMemberDummy, TeamMemberFake],
        admins: [teamToAdminDummy],
      });
      let exception: any;

      try {
        await teamManagementService.updateTeamSize(userDummy.id, TeamWithMembersDummy.id, 3);
      } catch (error) {
        exception = error;
      }
      const errorMessage = `User with id: ${userDummy.id} is not an admin member of this team!`;
      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(UnauthorizedException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: updates team size if payment_type is STRIPE', async () => {
      TeamRepositoryMock.orm.findOne.mockResolvedValue({
        ...TeamWithMembersDummy,
        payment_type: PaymentType.STRIPE,
        team_size: 2,
        team_size_limit: 10,
      });
      TeamRepositoryMock.getTeamIncludingUnregistered.mockResolvedValueOnce({
        members: [TeamMemberDummy, TeamMemberFake],
        admins: [teamToAdminDummy],
      });
      const {
        stripe_data: { subscriptionId, subscriptionItemId },
      } = TeamWithMembersDummy;

      await teamManagementService.updateTeamSize(adminId, TeamWithMembersDummy.id, 3);

      expect(StripeServiceMock.updateSubscription).toHaveBeenCalledWith(subscriptionId, subscriptionItemId, 3);
    });
  });

  describe('getAllTeamMembers', () => {
    it('negative: if team does not exist in DB, throw the NotFoundException', async () => {
      TeamRepositoryMock.orm.findOne.mockResolvedValue(null);
      let exception: any;
      try {
        await teamManagementService.getAllTeamMembers(userDummy.id, TeamWithMembersDummy.id);
      } catch (error) {
        exception = error;
      }

      const errorMessage = `Team with id: ${TeamWithMembersDummy.id} doesn't exist!`;
      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('negative: if user is not admin member of team, throw the UnauthorizedException', async () => {
      TeamRepositoryMock.orm.findOne.mockResolvedValue(TeamWithMembersDummy);
      TeamRepositoryMock.getTeamIncludingUnregistered.mockResolvedValueOnce({
        members: [TeamMemberDummy, TeamMemberFake],
        admins: [teamToAdminDummy],
      });
      let exception: any;

      try {
        await teamManagementService.getAllTeamMembers(userDummy.id, TeamWithMembersDummy.id);
      } catch (error) {
        exception = error;
      }

      const errorMessage = `User with id: ${userDummy.id} is not an admin member of this team!`;
      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(UnauthorizedException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('negative: if user is not admin member of team (empty admins array), throw the UnauthorizedException', async () => {
      TeamRepositoryMock.orm.findOne.mockResolvedValue(TeamWithMembersDummy);
      TeamRepositoryMock.getTeamIncludingUnregistered.mockResolvedValueOnce({
        members: [TeamMemberDummy, TeamMemberFake],
        admins: [],
      });
      let exception: any;

      try {
        await teamManagementService.getAllTeamMembers(adminId, TeamWithMembersDummy.id);
      } catch (error) {
        exception = error;
      }

      const errorMessage = `User with id: ${adminId} is not an admin member of this team!`;
      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(UnauthorizedException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('negative: if user is not admin member of team (different admin), throw the UnauthorizedException', async () => {
      const differentAdminId = randomUUID();
      const differentAdmin = new TeamToAdmin({
        id: randomUUID(),
        admin_id: differentAdminId,
        team_id: TeamWithMembersDummy.id,
      });

      TeamRepositoryMock.orm.findOne.mockResolvedValue(TeamWithMembersDummy);
      TeamRepositoryMock.getTeamIncludingUnregistered.mockResolvedValueOnce({
        members: [TeamMemberDummy, TeamMemberFake],
        admins: [differentAdmin],
      });
      let exception: any;

      try {
        await teamManagementService.getAllTeamMembers(adminId, TeamWithMembersDummy.id);
      } catch (error) {
        exception = error;
      }

      const errorMessage = `User with id: ${adminId} is not an admin member of this team!`;
      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(UnauthorizedException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: should get members, admins of team with last 90 days DailyStats', async () => {
      TeamRepositoryMock.orm.findOne.mockResolvedValue(TeamWithMembersDummy);
      TeamRepositoryMock.getTeamIncludingUnregistered.mockResolvedValueOnce({
        members: [TeamMemberDummy, TeamMemberFake],
        admins: [teamToAdminDummy],
      });

      UserRepositoryMock.orm.find.mockResolvedValueOnce([
        {
          morning_routines_streak: userDummy.morning_routines_streak,
          evening_routines_streak: userDummy.evening_routines_streak,
          focus_modes_streak: userDummy.focus_modes_streak,
          id: TeamMemberFake.member_id,
        },
        {
          morning_routines_streak: userDummy.morning_routines_streak,
          evening_routines_streak: userDummy.evening_routines_streak,
          focus_modes_streak: userDummy.focus_modes_streak,
          id: TeamMemberDummy.member_id,
        },
      ]);

      UserDailyStatsServiceMock.getLastNDaysDailyStats.mockResolvedValue(DailyStatsDummy);

      const response = await teamManagementService.getAllTeamMembers(adminId, TeamWithMembersDummy.id);

      expect(response.admins).toHaveLength(1);
      expect(response.members).toHaveLength(2); // Only includes members, not admins

      // Verify total_hours_in_focus_sessions is calculated correctly
      // DailyStatsDummy has: 2.5 + 1.8 + 3.2 = 7.5 hours
      const member = response.members.find((m) => m.id === TeamMemberDummy.member_id);
      expect(member?.total_hours_in_focus_sessions).toBe(7.5);
    });

    it('positive: should handle team with no members', async () => {
      TeamRepositoryMock.orm.findOne.mockResolvedValue(TeamWithMembersDummy);
      TeamRepositoryMock.getTeamIncludingUnregistered.mockResolvedValueOnce({
        members: [],
        admins: [teamToAdminDummy],
      });

      const response = await teamManagementService.getAllTeamMembers(adminId, TeamWithMembersDummy.id);

      expect(response.admins).toHaveLength(1);
      expect(response.members).toHaveLength(0);
      expect(response.total_count).toBe(0);
      expect(response.team_id).toBe(TeamWithMembersDummy.id);
    });

    it('positive: should handle team with only unregistered members (no member_id)', async () => {
      const unregisteredMember = new TeamToMember({
        id: randomUUID(),
        first_name: 'Unregistered',
        last_name: 'User',
        email: 'unregistered@email.com',
        team_id: TeamWithMembersDummy.id,
        member_id: null, // Unregistered user
        member_expiry_date: TeamWithMembersDummy.expires_date as Date,
        invitation_status: InvitationStatus.PENDING,
        invitation_sent_at: new Date(),
        invitation_send_count: 1,
        invitation_responded_at: null,
      });

      TeamRepositoryMock.orm.findOne.mockResolvedValue(TeamWithMembersDummy);
      TeamRepositoryMock.getTeamIncludingUnregistered.mockResolvedValueOnce({
        members: [unregisteredMember],
        admins: [teamToAdminDummy],
      });

      const response = await teamManagementService.getAllTeamMembers(adminId, TeamWithMembersDummy.id);

      expect(response.admins).toHaveLength(1);
      expect(response.members).toHaveLength(1);
      expect(response.total_count).toBe(1);
      expect(response.members[0].id).toBe(null);
      expect(response.members[0].email).toBe('unregistered@email.com');
      expect(response.members[0].total_hours_in_focus_sessions).toBe(0);
    });

    it('positive: should handle team with mixed registered and unregistered members', async () => {
      const unregisteredMember = new TeamToMember({
        id: randomUUID(),
        first_name: 'Unregistered',
        last_name: 'User',
        email: 'unregistered@email.com',
        team_id: TeamWithMembersDummy.id,
        member_id: null,
        member_expiry_date: TeamWithMembersDummy.expires_date as Date,
        invitation_status: InvitationStatus.PENDING,
        invitation_sent_at: new Date(),
        invitation_send_count: 1,
        invitation_responded_at: null,
      });

      TeamRepositoryMock.orm.findOne.mockResolvedValue(TeamWithMembersDummy);
      TeamRepositoryMock.getTeamIncludingUnregistered.mockResolvedValueOnce({
        members: [TeamMemberDummy, unregisteredMember],
        admins: [teamToAdminDummy],
      });

      UserRepositoryMock.orm.find.mockResolvedValueOnce([
        {
          morning_routines_streak: userDummy.morning_routines_streak,
          evening_routines_streak: userDummy.evening_routines_streak,
          focus_modes_streak: userDummy.focus_modes_streak,
          id: TeamMemberDummy.member_id,
        },
      ]);

      // Mock daily stats for registered member only
      UserDailyStatsServiceMock.getLastNDaysDailyStats
        .mockResolvedValueOnce(DailyStatsDummy) // For TeamMemberDummy
        .mockResolvedValueOnce([]); // For unregistered member (no stats)

      const response = await teamManagementService.getAllTeamMembers(adminId, TeamWithMembersDummy.id);

      expect(response.admins).toHaveLength(1);
      expect(response.members).toHaveLength(2);
      expect(response.total_count).toBe(2);

      // Check registered member has user details
      const registeredMember = response.members.find((m) => m.id === TeamMemberDummy.member_id);
      expect(registeredMember).toBeDefined();
      expect(registeredMember.morning_routines_streak).toBe(userDummy.morning_routines_streak);

      // Check unregistered member has basic info but no user details
      const unregisteredMemberResponse = response.members.find((m) => m.id === null);
      expect(unregisteredMemberResponse).toBeDefined();
      expect(unregisteredMemberResponse.email).toBe('unregistered@email.com');
      expect(unregisteredMemberResponse.morning_routines_streak).toBe(0);
      expect(unregisteredMemberResponse.total_hours_in_focus_sessions).toBe(0);
    });

    it('positive: should calculate focus_modes_percent_number_day_of_stats_completed correctly', async () => {
      const mockDailyStats = [
        { focus_modes: 2 },
        { focus_modes: 1 },
        { focus_modes: 3 },
        { focus_modes: 0 },
        { focus_modes: 2 },
      ];

      TeamRepositoryMock.orm.findOne.mockResolvedValue(TeamWithMembersDummy);
      TeamRepositoryMock.getTeamIncludingUnregistered.mockResolvedValueOnce({
        members: [TeamMemberDummy],
        admins: [teamToAdminDummy],
      });

      UserRepositoryMock.orm.find.mockResolvedValueOnce([
        {
          morning_routines_streak: userDummy.morning_routines_streak,
          evening_routines_streak: userDummy.evening_routines_streak,
          focus_modes_streak: userDummy.focus_modes_streak,
          id: TeamMemberDummy.member_id,
        },
      ]);

      UserDailyStatsServiceMock.getLastNDaysDailyStats.mockResolvedValue(mockDailyStats);

      const response = await teamManagementService.getAllTeamMembers(adminId, TeamWithMembersDummy.id);

      expect(response.members).toHaveLength(1);
      const member = response.members[0];

      // Total focus modes: 2+1+3+0+2 = 8
      // Days with stats: 5
      // Percentage: (8/5) * 100 = 160%
      expect(member.focus_modes_percent_number_day_of_stats_completed).toBe(160);
    });

    it('positive: should handle empty daily stats array', async () => {
      TeamRepositoryMock.orm.findOne.mockResolvedValue(TeamWithMembersDummy);
      TeamRepositoryMock.getTeamIncludingUnregistered.mockResolvedValueOnce({
        members: [TeamMemberDummy],
        admins: [teamToAdminDummy],
      });

      UserRepositoryMock.orm.find.mockResolvedValueOnce([
        {
          morning_routines_streak: userDummy.morning_routines_streak,
          evening_routines_streak: userDummy.evening_routines_streak,
          focus_modes_streak: userDummy.focus_modes_streak,
          id: TeamMemberDummy.member_id,
        },
      ]);

      UserDailyStatsServiceMock.getLastNDaysDailyStats.mockResolvedValue([]);

      const response = await teamManagementService.getAllTeamMembers(adminId, TeamWithMembersDummy.id);

      expect(response.members).toHaveLength(1);
      const member = response.members[0];
      expect(member.focus_modes_percent_number_day_of_stats_completed).toBe(0);
      expect(member.total_hours_in_focus_sessions).toBe(0);
    });

    it('positive: should handle null daily stats', async () => {
      TeamRepositoryMock.orm.findOne.mockResolvedValue(TeamWithMembersDummy);
      TeamRepositoryMock.getTeamIncludingUnregistered.mockResolvedValueOnce({
        members: [TeamMemberDummy],
        admins: [teamToAdminDummy],
      });

      UserRepositoryMock.orm.find.mockResolvedValueOnce([
        {
          morning_routines_streak: userDummy.morning_routines_streak,
          evening_routines_streak: userDummy.evening_routines_streak,
          focus_modes_streak: userDummy.focus_modes_streak,
          id: TeamMemberDummy.member_id,
        },
      ]);

      UserDailyStatsServiceMock.getLastNDaysDailyStats.mockResolvedValue(null);

      const response = await teamManagementService.getAllTeamMembers(adminId, TeamWithMembersDummy.id);

      expect(response.members).toHaveLength(1);
      const member = response.members[0];
      expect(member.focus_modes_percent_number_day_of_stats_completed).toBe(0);
      expect(member.total_hours_in_focus_sessions).toBe(0);
    });

    it('positive: should calculate total_hours_in_focus_sessions correctly from daily stats', async () => {
      const mockDailyStats = [
        { focus_modes: 2, total_hours_spent_in_focus_sessions: 1.5 },
        { focus_modes: 1, total_hours_spent_in_focus_sessions: 0.8 },
        { focus_modes: 3, total_hours_spent_in_focus_sessions: 2.2 },
        { focus_modes: 0, total_hours_spent_in_focus_sessions: 0.0 },
        { focus_modes: 2, total_hours_spent_in_focus_sessions: 1.1 },
      ];

      TeamRepositoryMock.orm.findOne.mockResolvedValue(TeamWithMembersDummy);
      TeamRepositoryMock.getTeamIncludingUnregistered.mockResolvedValueOnce({
        members: [TeamMemberDummy],
        admins: [teamToAdminDummy],
      });

      UserRepositoryMock.orm.find.mockResolvedValueOnce([
        {
          morning_routines_streak: userDummy.morning_routines_streak,
          evening_routines_streak: userDummy.evening_routines_streak,
          focus_modes_streak: userDummy.focus_modes_streak,
          id: TeamMemberDummy.member_id,
        },
      ]);

      UserDailyStatsServiceMock.getLastNDaysDailyStats.mockResolvedValue(mockDailyStats);

      const response = await teamManagementService.getAllTeamMembers(adminId, TeamWithMembersDummy.id);

      expect(response.members).toHaveLength(1);
      const member = response.members[0];

      // Total hours: 1.5 + 0.8 + 2.2 + 0.0 + 1.1 = 5.6
      expect(member.total_hours_in_focus_sessions).toBe(5.6);
    });
  });

  describe('revokeTeamMembersEntitlements', () => {
    it('positive: should revoke members team_member entitlements in revenue cat if member is part of only one team', async () => {
      const memberOneId = randomUUID();
      const memberTwoId = randomUUID();
      const teamOneId = randomUUID();
      const teamTwoId = randomUUID();
      TeamRepositoryMock.orm.findOne.mockResolvedValueOnce(TeamWithMembersDummy);
      TeamRepositoryMock.getTeamMembers.mockResolvedValueOnce([{ id: memberOneId }, { id: memberTwoId }]);
      TeamToMemberRepositoryMock.orm.find.mockResolvedValueOnce([{ id: teamOneId }, { id: teamTwoId }]);
      TeamToMemberRepositoryMock.orm.find.mockResolvedValueOnce([{ id: teamOneId }]);

      await teamManagementService.revokeTeamMembersEntitlements('sub_1234');

      expect(RevenueCatServiceMock.revokeTeamMembership).toHaveBeenCalledWith(memberTwoId, Entitlement.team_member);
    });
  });

  describe('revokeAdminMembersEntitlements', () => {
    it('positive: should revoke members team_admin entitlements in revenue cat if member is part of only one team', async () => {
      TeamRepositoryMock.orm.findOne.mockResolvedValueOnce(TeamWithMembersDummy);
      TeamToAdminRepositoryMock.getTeamAdmins.mockResolvedValue([teamToAdminDummy, teamToAdminTeamMemberDummy]);
      TeamToAdminRepositoryMock.orm.find
        .mockResolvedValueOnce([
          {
            id: randomUUID(),
            admin_id: teamToAdminDummy.admin_id,
            team_id: TeamWithMembersDummy.id,
          },
          { id: randomUUID(), admin_id: teamToAdminDummy.admin_id, team_id: randomUUID() },
        ])
        .mockResolvedValueOnce([
          {
            id: randomUUID(),
            admin_id: TeamMemberDummy.member_id,
            team_id: TeamWithMembersDummy.id,
          },
        ]);

      await teamManagementService.revokeAdminMembersEntitlements('sub_1234');

      expect(RevenueCatServiceMock.revokeTeamMembership).toHaveBeenCalledWith(
        TeamMemberDummy.member_id,
        Entitlement.team_admin,
      );
    });
  });

  describe('revokeOwnerEntitlement', () => {
    it("positive: should revoke owner of team's team_owner entitlement in revenue cat if member is owner of only one team", async () => {
      const ownerId = randomUUID();
      const teamOneId = randomUUID();
      TeamRepositoryMock.orm.findOne.mockResolvedValueOnce({
        owner: { id: ownerId, owned_teams: [{ id: teamOneId }] },
      });

      await teamManagementService.revokeOwnerEntitlement('sub_1234');

      expect(RevenueCatServiceMock.revokeTeamMembership).toHaveBeenCalledWith(ownerId, Entitlement.team_owner);
    });

    it("positive: should NOT revoke owner of team's team_owner entitlement in revenue cat if member is owner of multiple teams", async () => {
      const ownerId = randomUUID();
      const teamOneId = randomUUID();
      const teamTwoId = randomUUID();
      TeamRepositoryMock.orm.findOne.mockResolvedValueOnce({
        owner: { id: ownerId, owned_teams: [{ id: teamOneId }, { id: teamTwoId }] },
      });

      await teamManagementService.revokeOwnerEntitlement('sub_1234');

      expect(RevenueCatServiceMock.revokeTeamMembership).not.toHaveBeenCalled();
    });
  });

  describe('reassignTeamMembersEntitlements', () => {
    it('positive: should assign team member entitlements for team members in revenue cat', async () => {
      TeamRepositoryMock.orm.findOne.mockResolvedValueOnce(TeamWithMembersDummy);
      TeamRepositoryMock.getTeamMembers.mockResolvedValueOnce([TeamMemberDummy, TeamMemberFake]);

      await teamManagementService.reassignTeamMembersEntitlements('sub_1234');

      expect(RevenueCatServiceMock.grantTeamMembership).toHaveBeenCalledWith(
        TeamMemberDummy.id,
        Entitlement.team_member,
        TeamWithMembersDummy.expires_date,
      );
      expect(RevenueCatServiceMock.grantTeamMembership).toHaveBeenCalledWith(
        TeamMemberFake.id,
        Entitlement.team_member,
        TeamWithMembersDummy.expires_date,
      );
    });
  });

  describe('handleTeamResubscription', () => {
    it('positive: team new stripe data should be saved if team is re activated with new subscription', async () => {
      const createSubscriptionPayloadDummy = {
        id: 'id',
        quantity: 5,
        customer: userDummy.stripe_customer_id,
        current_period_end: 1676874600,
        items: { data: [{ id: 'sub_id_1' }] },
      };
      const stripeDataDummy = {
        subscriptionId: createSubscriptionPayloadDummy.id,
        customerId: userDummy.stripe_customer_id,
        subscriptionItemId: createSubscriptionPayloadDummy.items.data[0].id,
      };
      TeamRepositoryMock.orm.findOne.mockResolvedValueOnce(TeamWithMembersDummy);
      const memberOneId = randomUUID();
      const memberTwoId = randomUUID();
      TeamRepositoryMock.orm.findOne.mockResolvedValueOnce({
        members: [{ id: memberOneId }, { id: memberTwoId }],
      });
      TeamRepositoryMock.getTeamMembers.mockResolvedValueOnce([TeamMemberDummy]);

      await teamManagementService.handleTeamResubscription(TeamWithMembersDummy.id, createSubscriptionPayloadDummy);

      expect(TeamRepositoryMock.orm.save).toHaveBeenCalledWith(
        new Team({
          ...TeamWithMembersDummy,
          is_active: true,
          stripe_subscription_id: createSubscriptionPayloadDummy.id,
          stripe_data: stripeDataDummy,
        }),
      );
    });
  });

  describe('handleTeamSubscriptionCancelled', () => {
    it('positive: team stripe data should be removed if subscription is cancelled', async () => {
      TeamRepositoryMock.orm.findOne
        .mockResolvedValueOnce(TeamWithMembersDummy)
        .mockResolvedValueOnce(TeamWithMembersDummy);
      const memberOneId = randomUUID();
      const memberTwoId = randomUUID();
      const teamOneId = randomUUID();
      const teamTwoId = randomUUID();
      TeamRepositoryMock.getTeamMembers.mockResolvedValueOnce([{ id: memberOneId }, { id: memberTwoId }]);
      TeamToMemberRepositoryMock.orm.find.mockResolvedValueOnce([{ id: teamOneId }, { id: teamTwoId }]);
      TeamToMemberRepositoryMock.orm.find.mockResolvedValueOnce([{ id: teamOneId }]);

      await teamManagementService.handleTeamSubscriptionCancelled('sub_123');

      expect(TeamRepositoryMock.orm.save).toHaveBeenCalledWith(
        new Team({ ...TeamWithMembersDummy, is_active: false, stripe_subscription_id: null, stripe_data: null }),
      );
    });
  });

  // // TODO: Implement unit tests for getAdminUserTeams function

  describe('deleteTeam', () => {
    it('positive: owner and members entitlements should be revoked and team should be deleted', async () => {
      const memberOneId = randomUUID();
      const memberTwoId = randomUUID();
      const teamOneId = randomUUID();
      const teamTwoId = randomUUID();
      const ownerId = randomUUID();
      TeamRepositoryMock.orm.findOne
        .mockResolvedValueOnce(TeamWithMembersDummy)
        .mockResolvedValueOnce(TeamWithMembersDummy);
      TeamRepositoryMock.orm.findOne.mockResolvedValueOnce({ team: TeamWithMembersDummy });
      TeamRepositoryMock.getTeamMembers.mockResolvedValueOnce([{ id: memberOneId }, { id: memberTwoId }]);
      TeamToMemberRepositoryMock.orm.find.mockResolvedValueOnce([{ id: teamOneId }, { id: teamTwoId }]);
      TeamToMemberRepositoryMock.orm.find.mockResolvedValueOnce([{ id: teamOneId }]);
      TeamToAdminRepositoryMock.getTeamAdmins.mockResolvedValueOnce([{ id: memberOneId }, { id: memberTwoId }]);
      TeamToAdminRepositoryMock.orm.find.mockResolvedValueOnce([{ id: teamOneId }, { id: teamTwoId }]);
      TeamToAdminRepositoryMock.orm.find.mockResolvedValueOnce([{ id: teamOneId }]);
      TeamRepositoryMock.orm.findOne.mockResolvedValueOnce({
        owner: { id: ownerId, owned_teams: [{ id: teamOneId }] },
      });

      await teamManagementService.deleteTeam(userDummy.id, TeamWithMembersDummy.id);

      expect(TeamRepositoryMock.orm.delete).toHaveBeenCalledWith({ id: TeamWithMembersDummy.id });
      expect(StripeServiceMock.cancelSubscription).toHaveBeenCalledWith(TeamWithMembersDummy.stripe_subscription_id);
    });
  });

  describe('updateMemberExpiryDate', () => {
    const updateMemberExpiryDateDtoDummy = {
      team_id: TeamWithMembersDummy.id,
      member_id: TeamMemberDummy.member_id,
      expiry_date: new Date('2023-11-18'),
    };

    it('negative: if team does not exist in DB, throw the NotFoundException', async () => {
      TeamRepositoryMock.orm.findOne.mockResolvedValue(null);
      let exception: any;
      try {
        await teamManagementService.updateMemberExpiryDate(userDummy.id, updateMemberExpiryDateDtoDummy);
      } catch (error) {
        exception = error;
      }

      const errorMessage = `Team with id: ${TeamWithMembersDummy.id} doesn't exist!`;
      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('negative: if user is not admin member of team, throw the UnauthorizedException', async () => {
      TeamRepositoryMock.orm.findOne.mockResolvedValue(TeamWithMembersDummy);
      TeamRepositoryMock.getTeamIncludingUnregistered.mockResolvedValueOnce({
        members: [TeamMemberDummy, TeamMemberFake],
        admins: [teamToAdminDummy],
      });
      let exception: any;

      try {
        await teamManagementService.updateMemberExpiryDate(userDummy.id, updateMemberExpiryDateDtoDummy);
      } catch (error) {
        exception = error;
      }
      const errorMessage = `User with id: ${userDummy.id} is not an admin member of this team!`;
      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(UnauthorizedException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('negative: if user is not found in the team, throw BadRequestException', async () => {
      TeamRepositoryMock.orm.findOne.mockResolvedValue(TeamWithMembersDummy);
      TeamRepositoryMock.getTeamIncludingUnregistered.mockResolvedValueOnce({
        members: [TeamMemberFake],
        admins: [teamToAdminDummy],
      });

      const errorMessage = `User with member_id: ${TeamMemberDummy.member_id} does not exist in the team (team_id: ${TeamWithMembersDummy.id}).`;
      let exception: any;

      try {
        await teamManagementService.updateMemberExpiryDate(adminId, updateMemberExpiryDateDtoDummy);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(BadRequestException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: should save linked member record with new expiry date', async () => {
      TeamRepositoryMock.orm.findOne.mockResolvedValue(TeamWithMembersDummy);
      TeamRepositoryMock.getTeamIncludingUnregistered.mockResolvedValueOnce({
        members: [{ ...TeamMemberDummy }],
        admins: [teamToAdminDummy],
      });
      RevenueCatServiceMock.updateEntitlementExpiry.mockResolvedValueOnce((arg) => arg);

      await teamManagementService.updateMemberExpiryDate(adminId, updateMemberExpiryDateDtoDummy);

      expect(TeamToMemberRepositoryMock.orm.save).toHaveBeenCalledWith({
        ...TeamMemberDummy,
        member_expiry_date: updateMemberExpiryDateDtoDummy.expiry_date,
      });
    });
  });

  describe('addTeamMemberManually', () => {
    const addTeamManuallyDtoDummy = {
      team_id: TeamWithMembersDummy.id,
      user_id: userDummy.id,
    };
    const fixedDate = new Date('2025-06-29T14:01:58.000Z');

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(fixedDate);
    });

    afterEach(() => {
      jest.useRealTimers(); // clean up after each test
    });

    it('negative: if user registration not found in DB, throw the NotFoundException', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(null);

      let exception;
      const errorMessage = `User with id: ${userDummy.id} doesn't exist!`;

      try {
        await teamManagementService.addTeamMemberManually(TeamWithMembersDummy.owner_id, addTeamManuallyDtoDummy);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('negative: if user registration not found in auth0, throw the NotFoundException', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      Auth0ManagementServiceMock.getAuth0User.mockResolvedValueOnce(null);

      let exception;
      const errorMessage = `User with id: ${userDummy.id} and auth0_id: ${userDummy.auth0_id} doesn't exist in auth0!`;

      try {
        await teamManagementService.addTeamMemberManually(TeamWithMembersDummy.owner_id, addTeamManuallyDtoDummy);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('negative: if team not found, throw the NotFoundException', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(newUser);
      Auth0ManagementServiceMock.getAuth0User.mockResolvedValueOnce({ ...auth0UserDummy, email: auth0NewUserEmail });
      TeamRepositoryMock.orm.findOne.mockResolvedValueOnce(null);

      let exception;
      const errorMessage = `Team with id: ${TeamWithMembersDummy.id} doesn't exist!`;

      try {
        await teamManagementService.addTeamMemberManually(TeamWithMembersDummy.owner_id, addTeamManuallyDtoDummy);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('negative: if user is not admin member of team, throw the UnauthorizedException', async () => {
      const userNonAdminDummy = randomUUID();
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      Auth0ManagementServiceMock.getAuth0User.mockResolvedValueOnce(auth0UserDummy);
      TeamRepositoryMock.orm.findOne.mockResolvedValue(TeamWithMembersDummy);
      TeamRepositoryMock.getTeamIncludingUnregistered.mockResolvedValueOnce({
        members: [TeamMemberDummy, TeamMemberFake],
        admins: [teamToAdminDummy],
      });
      let exception: any;

      try {
        await teamManagementService.addTeamMemberManually(userNonAdminDummy, addTeamManuallyDtoDummy);
      } catch (error) {
        exception = error;
      }

      const errorMessage = `User with id: ${userNonAdminDummy} is not an admin member of this team!`;
      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(UnauthorizedException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('negative: if team payment_type is OFFLINE and capacity is full, throw the BadRequestException', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      Auth0ManagementServiceMock.getAuth0User.mockResolvedValueOnce(auth0UserDummy);
      TeamRepositoryMock.orm.findOne.mockResolvedValueOnce({
        ...TeamWithMembersDummy,
        payment_type: PaymentType.OFFLINE,
        team_size: 2,
        team_size_limit: 2,
      });
      TeamRepositoryMock.getTeamIncludingUnregistered.mockResolvedValueOnce({
        members: [TeamMemberDummy, TeamMemberFake],
        admins: [teamToAdminDummy],
      });
      let exception: any;
      const errorMessage = `Unable to invite more members to team with id: ${TeamWithMembersDummy.id}, maximum capacity reached!`;
      try {
        await teamManagementService.addTeamMemberManually(adminId, addTeamManuallyDtoDummy);
      } catch (error) {
        exception = error;
      }
      expect(exception).toBeInstanceOf(BadRequestException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('negative: if the user is already a member of the team, throw the BadRequestException', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce({ ...userDummy, id: TeamMemberDummy.member_id });
      Auth0ManagementServiceMock.getAuth0User.mockResolvedValueOnce(auth0UserDummy);
      TeamRepositoryMock.orm.findOne.mockResolvedValueOnce({
        ...TeamWithMembersDummy,
        payment_type: PaymentType.OFFLINE,
        team_size: 2,
        team_size_limit: 10,
      });
      TeamRepositoryMock.getTeamIncludingUnregistered.mockResolvedValueOnce({
        members: [TeamMemberDummy, TeamMemberFake],
        admins: [teamToAdminDummy],
      });
      let exception: any;

      try {
        await teamManagementService.addTeamMemberManually(adminId, {
          ...addTeamManuallyDtoDummy,
          user_id: TeamMemberDummy.member_id,
        });
      } catch (error) {
        exception = error;
      }

      const errorMessage = `User with id ${TeamMemberDummy.member_id} is already in team with id: ${addTeamManuallyDtoDummy.team_id}`;
      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(BadRequestException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: user with team association should be saved in the DB and the membership entitlement need to be granted via RevenueCat', async () => {
      const newMember = { ...TeamMemberDummy, id: randomUUID() };
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(newMember);
      Auth0ManagementServiceMock.getAuth0User.mockResolvedValueOnce({ ...auth0UserDummy, user_id: newMember.id });
      TeamRepositoryMock.getTeamIncludingUnregistered.mockResolvedValueOnce({
        members: [TeamMemberDummy, TeamMemberFake],
        admins: [teamToAdminDummy],
      });
      TeamRepositoryMock.orm.findOne.mockResolvedValueOnce({
        ...TeamWithMembersDummy,
        team_size: 1,
        team_size_limit: 10,
      });

      TeamToMemberRepositoryMock.orm.findOne.mockResolvedValue(null);
      TeamToMemberRepositoryMock.orm.create.mockImplementation((args) => args);

      TeamRepositoryMock.getTeamIncludingUnregistered.mockResolvedValue({
        team: TeamWithMembersDummy,
        members: [TeamMemberDummy],
      });

      await teamManagementService.addTeamMemberManually(adminId, addTeamManuallyDtoDummy);

      expect(TeamToMemberRepositoryMock.orm.save).toHaveBeenCalledWith({
        member_id: newMember.id,
        team_id: TeamWithMembersDummy.id,
        first_name: auth0UserDummy.given_name,
        last_name: auth0UserDummy.family_name,
        email: auth0UserDummy.email,
        invitation_status: InvitationStatus.ACCEPTED,
        invitation_responded_at: fixedDate,
        invitation_sent_at: fixedDate,
        invitation_send_count: 1,
        member_expiry_date: TeamWithMembersDummy.expires_date as Date,
      });
      expect(RevenueCatServiceMock.grantTeamMembership).toHaveBeenCalledWith(
        newMember.id,
        Entitlement.team_member,
        TeamWithMembersDummy.expires_date,
      );
    });
  });

  describe('joinTeam', () => {
    const userId = randomUUID();
    const validJoinCode = 'ABCD1234';
    const validCodeRecord = {
      id: randomUUID(),
      team_id: TeamWithMembersDummy.id,
      code: validJoinCode,
      is_active: true,
      max_redemptions: null,
      redemption_count: 0,
      expires_at: null,
      created_by: adminId,
    };

    const setupJoinTeamTransactionMocks = ({
      codeRecord = validCodeRecord,
      team = TeamWithMembersDummy,
      existingMember = null,
      membersCount = 1,
      insertIdentifiers = [{ id: randomUUID() }],
      updateAffected = 1,
    }: {
      codeRecord?: any;
      team?: any;
      existingMember?: any;
      membersCount?: number;
      insertIdentifiers?: any[];
      updateAffected?: number;
    } = {}) => {
      const joinCodeQueryBuilder = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(codeRecord),
      };
      const teamQueryBuilder = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(team),
      };
      const insertQueryBuilder = {
        insert: jest.fn().mockReturnThis(),
        into: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        orIgnore: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ identifiers: insertIdentifiers }),
      };
      const updateQueryBuilder = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: updateAffected }),
      };
      const teamToMemberOrm = {
        findOne: jest.fn().mockResolvedValue(existingMember),
        count: jest.fn().mockResolvedValue(membersCount),
      };

      const manager = {
        createQueryBuilder: jest
          .fn()
          .mockReturnValueOnce(joinCodeQueryBuilder)
          .mockReturnValueOnce(teamQueryBuilder)
          .mockReturnValueOnce(insertQueryBuilder)
          .mockReturnValueOnce(updateQueryBuilder),
        getRepository: jest.fn().mockImplementation((entity) => {
          if (entity === TeamToMember) {
            return teamToMemberOrm;
          }
          throw new Error(`Unexpected entity: ${entity}`);
        }),
      };

      (TeamJoinCodeRepositoryMock.orm as any).manager = {
        transaction: jest.fn().mockImplementationOnce(async (callback) => callback(manager)),
      };

      return {
        manager,
        joinCodeQueryBuilder,
        teamQueryBuilder,
        insertQueryBuilder,
        updateQueryBuilder,
        teamToMemberOrm,
      };
    };

    it('negative: if join code does not exist, throw NotFoundException', async () => {
      setupJoinTeamTransactionMocks({ codeRecord: null });

      let exception: any;
      try {
        await teamManagementService.joinTeam(userId, 'INVALID_CODE');
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual('Invalid join code');
    });

    it('negative: if join code is deactivated, throw BadRequestException', async () => {
      setupJoinTeamTransactionMocks({ codeRecord: { ...validCodeRecord, is_active: false } });

      let exception: any;
      try {
        await teamManagementService.joinTeam(userId, validJoinCode);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(BadRequestException);
      expect(exception.message).toEqual('This join code has been deactivated');
    });

    it('negative: if join code has expired, throw BadRequestException', async () => {
      setupJoinTeamTransactionMocks({
        codeRecord: {
          ...validCodeRecord,
          expires_at: new Date('2020-01-01'),
        },
      });

      let exception: any;
      try {
        await teamManagementService.joinTeam(userId, validJoinCode);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(BadRequestException);
      expect(exception.message).toEqual('This join code has expired');
    });

    it('negative: if join code has reached max redemptions, throw BadRequestException', async () => {
      setupJoinTeamTransactionMocks({
        codeRecord: {
          ...validCodeRecord,
          max_redemptions: 1,
          redemption_count: 1,
        },
      });

      let exception: any;
      try {
        await teamManagementService.joinTeam(userId, validJoinCode);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(BadRequestException);
      expect(exception.message).toEqual('This join code has reached its maximum number of redemptions');
    });

    it('negative: if team does not exist, throw NotFoundException with "Team not found"', async () => {
      setupJoinTeamTransactionMocks({ team: null });

      let exception: any;
      try {
        await teamManagementService.joinTeam(userId, validJoinCode);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual('Team not found');
    });

    it('negative: if team is expired, throw NotFoundException with "Team not found"', async () => {
      setupJoinTeamTransactionMocks({
        team: {
          ...TeamWithMembersDummy,
          expires_date: new Date('2020-01-01'),
        },
      });

      let exception: any;
      try {
        await teamManagementService.joinTeam(userId, validJoinCode);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual('Team not found');
    });

    it('positive: if user is already a member, return 200 idempotent response', async () => {
      const { manager } = setupJoinTeamTransactionMocks({ existingMember: TeamMemberDummy });

      const result = await teamManagementService.joinTeam(TeamMemberDummy.member_id, validJoinCode);

      expect(result).toEqual({
        message: 'User is already a member of this team',
        statusCode: 200,
      });
      expect(manager.createQueryBuilder).toHaveBeenCalledTimes(2);
    });

    it('negative: if team has reached its member limit, throw BadRequestException', async () => {
      const fullTeam = {
        ...TeamWithMembersDummy,
        team_size_limit: 2,
      };
      setupJoinTeamTransactionMocks({ team: fullTeam, existingMember: null, membersCount: 2 });

      let exception: any;
      try {
        await teamManagementService.joinTeam(userId, validJoinCode);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(BadRequestException);
      expect(exception.message).toEqual('Team has reached its member limit');
    });

    it('positive: user should be added as standard member with correct fields and code redemption incremented', async () => {
      const teamWithCapacity = {
        ...TeamWithMembersDummy,
        team_size_limit: 10,
      };
      const { insertQueryBuilder, updateQueryBuilder } = setupJoinTeamTransactionMocks({
        team: teamWithCapacity,
        existingMember: null,
        membersCount: 1,
      });

      const result = await teamManagementService.joinTeam(userId, validJoinCode);

      expect(result).toEqual({
        message: 'Successfully joined team',
        team_id: TeamWithMembersDummy.id,
        team_name: TeamWithMembersDummy.name,
        statusCode: 201,
      });

      expect(insertQueryBuilder.values).toHaveBeenCalledWith({
        team_id: TeamWithMembersDummy.id,
        member_id: userId,
        member_expiry_date: teamWithCapacity.expires_date,
        invitation_status: InvitationStatus.ACCEPTED,
        invitation_sent_at: null,
        invitation_send_count: 0,
        invitation_responded_at: null,
      });

      expect(updateQueryBuilder.execute).toHaveBeenCalled();

      expect(RevenueCatServiceMock.grantTeamMembership).toHaveBeenCalledWith(
        userId,
        Entitlement.team_member,
        teamWithCapacity.expires_date,
      );
    });

    it('positive: user should be added when team has no team_size_limit (null)', async () => {
      const teamNoLimit = {
        ...TeamWithMembersDummy,
        team_size_limit: null,
      };
      setupJoinTeamTransactionMocks({ team: teamNoLimit, existingMember: null, membersCount: 1 });

      const result = await teamManagementService.joinTeam(userId, validJoinCode);

      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('Successfully joined team');
    });

    it('positive: member_expiry_date should be null if team has no expires_date', async () => {
      const teamNoExpiry = {
        ...TeamWithMembersDummy,
        expires_date: null,
        team_size_limit: 10,
      };
      const { insertQueryBuilder } = setupJoinTeamTransactionMocks({
        team: teamNoExpiry,
        existingMember: null,
        membersCount: 0,
      });

      await teamManagementService.joinTeam(userId, validJoinCode);

      expect(insertQueryBuilder.values).toHaveBeenCalledWith(
        expect.objectContaining({
          member_expiry_date: null,
        }),
      );
    });

    it('positive: entitlement grant failure should be logged via Sentry but not fail the request', async () => {
      const teamWithCapacity = {
        ...TeamWithMembersDummy,
        team_size_limit: 10,
      };
      setupJoinTeamTransactionMocks({ team: teamWithCapacity, existingMember: null, membersCount: 1 });
      RevenueCatServiceMock.grantTeamMembership.mockRejectedValueOnce(new Error('RevenueCat API error'));

      const result = await teamManagementService.joinTeam(userId, validJoinCode);

      expect(result.statusCode).toBe(201);
      expect(SentryServiceMock.instance().captureException).toHaveBeenCalled();
    });

    it('negative: if redemption increment fails due concurrent limit hit, throw BadRequestException and rollback insert', async () => {
      const teamWithCapacity = {
        ...TeamWithMembersDummy,
        team_size_limit: 10,
      };
      setupJoinTeamTransactionMocks({
        team: teamWithCapacity,
        existingMember: null,
        membersCount: 1,
        updateAffected: 0,
      });

      let exception: any;
      try {
        await teamManagementService.joinTeam(userId, validJoinCode);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(BadRequestException);
      expect(exception.message).toEqual('This join code has reached its maximum number of redemptions');
      expect(RevenueCatServiceMock.grantTeamMembership).not.toHaveBeenCalled();
    });
  });

  describe('createJoinCode', () => {
    it('positive: should create an unlimited join code', async () => {
      TeamRepositoryMock.orm.findOne.mockResolvedValueOnce(TeamWithMembersDummy);
      TeamRepositoryMock.getTeamIncludingUnregistered.mockResolvedValueOnce({
        members: [TeamMemberDummy],
        admins: [{ admin_id: adminId }],
      });
      TeamJoinCodeRepositoryMock.orm.create.mockImplementation((args) => args);
      TeamJoinCodeRepositoryMock.orm.save.mockImplementation((args) => Promise.resolve(args));

      const result = await teamManagementService.createJoinCode(adminId, {
        team_id: TeamWithMembersDummy.id,
      });

      expect(result).toEqual(
        expect.objectContaining({
          team_id: TeamWithMembersDummy.id,
          is_active: true,
          max_redemptions: null,
          redemption_count: 0,
          created_by: adminId,
        }),
      );
      expect(result.code).toBeDefined();
      expect(typeof result.code).toBe('string');
    });

    it('positive: should create a single-use join code', async () => {
      TeamRepositoryMock.orm.findOne.mockResolvedValueOnce(TeamWithMembersDummy);
      TeamRepositoryMock.getTeamIncludingUnregistered.mockResolvedValueOnce({
        members: [TeamMemberDummy],
        admins: [{ admin_id: adminId }],
      });
      TeamJoinCodeRepositoryMock.orm.create.mockImplementation((args) => args);
      TeamJoinCodeRepositoryMock.orm.save.mockImplementation((args) => Promise.resolve(args));

      const result = await teamManagementService.createJoinCode(adminId, {
        team_id: TeamWithMembersDummy.id,
        max_redemptions: 1,
      });

      expect(result.max_redemptions).toBe(1);
    });

    it('negative: non-admin should not be able to create join codes', async () => {
      const nonAdminId = randomUUID();
      TeamRepositoryMock.orm.findOne.mockResolvedValueOnce(TeamWithMembersDummy);
      TeamRepositoryMock.getTeamIncludingUnregistered.mockResolvedValueOnce({
        members: [TeamMemberDummy],
        admins: [{ admin_id: adminId }],
      });

      let exception: any;
      try {
        await teamManagementService.createJoinCode(nonAdminId, {
          team_id: TeamWithMembersDummy.id,
        });
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeInstanceOf(UnauthorizedException);
    });

    it('negative: should reject expired join code dates', async () => {
      TeamRepositoryMock.orm.findOne.mockResolvedValueOnce(TeamWithMembersDummy);
      TeamRepositoryMock.getTeamIncludingUnregistered.mockResolvedValueOnce({
        members: [TeamMemberDummy],
        admins: [{ admin_id: adminId }],
      });

      let exception: any;
      try {
        await teamManagementService.createJoinCode(adminId, {
          team_id: TeamWithMembersDummy.id,
          expires_at: '2020-01-01T00:00:00.000Z',
        });
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeInstanceOf(BadRequestException);
      expect(exception.message).toBe('Join code expiration must be in the future');
    });
  });

  describe('createBatchJoinCodes', () => {
    it('positive: should create requested number of single-use join codes', async () => {
      TeamRepositoryMock.orm.findOne.mockResolvedValueOnce(TeamWithMembersDummy);
      TeamRepositoryMock.getTeamIncludingUnregistered.mockResolvedValueOnce({
        members: [TeamMemberDummy],
        admins: [{ admin_id: adminId }],
      });
      TeamJoinCodeRepositoryMock.orm.create.mockImplementation((args) => args);
      TeamJoinCodeRepositoryMock.orm.save.mockImplementation((args) => Promise.resolve(args));

      const result = await teamManagementService.createBatchJoinCodes(adminId, {
        team_id: TeamWithMembersDummy.id,
        count: 3,
      });

      expect(result).toHaveLength(3);
      result.forEach((code) => {
        expect(code.max_redemptions).toBe(1);
        expect(code.redemption_count).toBe(0);
        expect(code.is_active).toBe(true);
        expect(code.created_by).toBe(adminId);
      });
    });

    it('negative: should reject expired join code dates', async () => {
      TeamRepositoryMock.orm.findOne.mockResolvedValueOnce(TeamWithMembersDummy);
      TeamRepositoryMock.getTeamIncludingUnregistered.mockResolvedValueOnce({
        members: [TeamMemberDummy],
        admins: [{ admin_id: adminId }],
      });

      let exception: any;
      try {
        await teamManagementService.createBatchJoinCodes(adminId, {
          team_id: TeamWithMembersDummy.id,
          count: 2,
          expires_at: '2020-01-01T00:00:00.000Z',
        });
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeInstanceOf(BadRequestException);
      expect(exception.message).toBe('Join code expiration must be in the future');
    });
  });

  describe('deactivateJoinCode', () => {
    it('positive: should deactivate a join code', async () => {
      const joinCodeRecord = {
        id: randomUUID(),
        team_id: TeamWithMembersDummy.id,
        code: 'TESTCODE',
        is_active: true,
      };
      TeamJoinCodeRepositoryMock.orm.findOne.mockResolvedValueOnce(joinCodeRecord);
      TeamRepositoryMock.orm.findOne.mockResolvedValueOnce(TeamWithMembersDummy);
      TeamRepositoryMock.getTeamIncludingUnregistered.mockResolvedValueOnce({
        members: [TeamMemberDummy],
        admins: [{ admin_id: adminId }],
      });

      await teamManagementService.deactivateJoinCode(adminId, joinCodeRecord.id);

      expect(TeamJoinCodeRepositoryMock.orm.save).toHaveBeenCalledWith(expect.objectContaining({ is_active: false }));
    });

    it('negative: should throw NotFoundException if join code does not exist', async () => {
      TeamJoinCodeRepositoryMock.orm.findOne.mockResolvedValueOnce(null);

      let exception: any;
      try {
        await teamManagementService.deactivateJoinCode(adminId, randomUUID());
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual('Join code not found');
    });
  });
});
