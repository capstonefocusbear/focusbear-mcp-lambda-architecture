import { RevenueCatService } from '@app/revenue-cat';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
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
} from '../../../../../test/mocks';
import { UserRepository } from '../../../user/repositories/user.repository';
import { TeamRepository } from '../../repositories/team.repository';
import { TeamManagementService } from './team-management.service';
import { EMAIL_TEMPLATE_IDS, FOCUS_BEAR_EMAILS } from '../../../../shared/utils/constants';
import { Entitlement } from '../../../subscription/domain/entitlement.enum';
import { Team } from '../../entities/team.entity';
import { TeamToMemberRepository } from '../../repositories/team-to-member.repository';
import { TeamToAdminRepository } from '../../repositories/team-to-admin.repository';
import { TeamToAdmin } from '../../entities/team-to-admin.entity';
import { TeamToMember } from '../../entities/team-to-member.entity';
import { PaymentType } from '../../domain/payment-type.enum';
import { UserDailyStatsService } from '../../../user/services/user-daily-stats/user-daily-stats.service';
import { InvitationStatus } from '../../domain/invitation-status.enum';

describe('TeamManagementService', () => {
  let teamManagementService: TeamManagementService;
  process.env = { JWT_INVITATION_SECRET: 'test-secret' };
  const firstName = 'first';
  const lastName = 'last';
  const newUser = { ...userDummy, id: randomUUID() };
  const auth0NewUserEmail = 'authNewUserEmail@email.com';
  const origin = 'https://dashboard.local.dev:3000';

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

  describe('addTeamMember', () => {
    it('negative: if user already participates that team, throw the BadRequestException', async () => {
      TeamRepositoryMock.getTeamIncludingUnregistered.mockResolvedValueOnce({
        team: TeamWithMembersDummy,
        members: [TeamMemberDummy],
      });
      let exception: any;

      try {
        await teamManagementService.addTeamMember(
          { ...newUser, id: TeamMemberDummy.member_id },
          TeamWithMembersDummy.owner_id,
          TeamWithMembersDummy.id,
          firstName,
          lastName,
          auth0NewUserEmail,
        );
      } catch (error) {
        exception = error;
      }

      const errorMessage = `User with ID ${TeamMemberDummy.member_id} is already in team with ID: ${TeamWithMembersDummy.id}`;
      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(BadRequestException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('negative: if team payment type is OFFLINE and maximum capacity has been reached, error should be thrown to avoid user from being added to team', async () => {
      TeamRepositoryMock.getTeamIncludingUnregistered.mockResolvedValueOnce({
        team: { ...TeamWithMembersDummy, payment_type: PaymentType.OFFLINE, team_size: 2, team_size_limit: 2 },
        members: [TeamMemberDummy, TeamMemberFake],
      });
      let exception: any;

      try {
        await teamManagementService.addTeamMember(
          newUser,
          TeamWithMembersDummy.owner_id,
          TeamWithMembersDummy.id,
          firstName,
          lastName,
          auth0NewUserEmail,
        );
      } catch (error) {
        exception = error;
      }

      const errorMessage = `Unable to invite more members to team with ID: ${TeamWithMembersDummy.id}, maximum capacity reached!`;
      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(BadRequestException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: user with team association should be saved in the DB and the membership entitlement need to be granted via RevenueCat', async () => {
      TeamToMemberRepositoryMock.orm.findOne.mockResolvedValue(null);
      TeamToMemberRepositoryMock.orm.create.mockImplementation((args) => args);
      TeamToMemberRepositoryMock.orm.save.mockResolvedValue({});
      TeamRepositoryMock.getTeamIncludingUnregistered.mockResolvedValue({
        team: TeamWithMembersDummy,
        members: [TeamMemberDummy],
      });

      await teamManagementService.addTeamMember(
        newUser,
        TeamWithMembersDummy.owner_id,
        TeamWithMembersDummy.id,
        firstName,
        lastName,
        auth0NewUserEmail,
      );

      expect(TeamToMemberRepositoryMock.orm.save).toBeCalledWith(
        expect.objectContaining({
          member_id: newUser.id,
          team_id: TeamWithMembersDummy.id,
          first_name: firstName,
          last_name: lastName,
          email: auth0NewUserEmail,
          invitation_status: InvitationStatus.ACCEPTED,
          invitation_send_count: 1,
        }),
      );
      expect(RevenueCatServiceMock.grantTeamMembership).toBeCalledWith(newUser.id, Entitlement.team_member);
    });

    it('positive: Stripe subscription should be updated to increment team size', async () => {
      TeamRepositoryMock.getTeamIncludingUnregistered.mockResolvedValue({
        team: TeamWithMembersDummy,
        members: [TeamMemberDummy],
      });

      const {
        stripe_data: { subscriptionId, subscriptionItemId },
      } = TeamWithMembersDummy;

      await teamManagementService.addTeamMember(
        newUser,
        TeamWithMembersDummy.owner_id,
        TeamWithMembersDummy.id,
        firstName,
        lastName,
        auth0NewUserEmail,
      );

      expect(StripeServiceMock.updateSubscription).toBeCalledWith(subscriptionId, subscriptionItemId, 2);
    });

    it('positive: if team payment_type is OFFLINE and team has open spaces, team size should be updated in DB, but not in Stripe', async () => {
      TeamRepositoryMock.getTeamIncludingUnregistered.mockResolvedValue({
        team: { ...TeamWithMembersDummy, payment_type: PaymentType.OFFLINE, team_size: 1, team_size_limit: 10 },
        members: [TeamMemberDummy],
      });

      await teamManagementService.addTeamMember(
        newUser,
        TeamWithMembersDummy.owner_id,
        TeamWithMembersDummy.id,
        firstName,
        lastName,
        auth0NewUserEmail,
      );

      expect(TeamRepositoryMock.update).toBeCalledWith(TeamWithMembersDummy.id, { team_size: 2 });
      expect(StripeServiceMock.updateSubscription).not.toBeCalled();
    });
  });

  describe('bulkDeleteTeamMembers', () => {
    it('negative: if team does not exist in DB, throw the NotFoundException', async () => {
      const owner_id = randomUUID();
      const member_ids = [randomUUID()];
      TeamRepositoryMock.getTeamIncludingUnregistered.mockResolvedValueOnce({ team: null });
      let exception: any;

      try {
        await teamManagementService.bulkDeleteTeamMembers({ member_ids, team_id: TeamWithMembersDummy.id }, owner_id);
      } catch (error) {
        exception = error;
      }

      const errorMessage = `The Team with owner_id: ${owner_id} does not exist or is inactive!`;
      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: user should be disassociated from the team in the DB and the membership entitlement needs to be revoked via RevenueCat', async () => {
      const teamId = TeamWithMembersDummy.id;
      const ownerId = TeamWithMembersDummy.owner_id;
      const memberToDelete = TeamMemberDummy;

      TeamToMemberRepositoryMock.orm.find.mockResolvedValueOnce([]).mockResolvedValueOnce([memberToDelete]);

      TeamRepositoryMock.getTeamIncludingUnregistered.mockResolvedValue({
        team: { ...TeamWithMembersDummy, team_size: 2, team_size_limit: 10, payment_type: PaymentType.STRIPE },
        members: [memberToDelete, TeamMemberFake],
      });

      await teamManagementService.bulkDeleteTeamMembers(
        { member_ids: [memberToDelete.member_id], team_id: teamId },
        ownerId,
      );

      expect(TeamToMemberRepositoryMock.orm.delete).toBeCalledWith({
        team_id: teamId,
        member_id: memberToDelete.member_id,
      });
      expect(RevenueCatServiceMock.revokeTeamMembership).toBeCalledWith(memberToDelete.id, Entitlement.team_member);
      expect(StripeServiceMock.updateSubscription).toBeCalledWith(
        TeamWithMembersDummy.stripe_data.subscriptionId,
        TeamWithMembersDummy.stripe_data.subscriptionItemId,
        1,
      );
      expect(TeamRepositoryMock.update).toBeCalledWith(teamId, { team_size: 1 });
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

    it('negative: if either email or user not provided, error should be thrown', async () => {
      TeamRepositoryMock.orm.findOneBy.mockResolvedValue(TeamWithMembersDummy);
      let exception;
      const errorMessage = 'Both email and user_id cannot be empty. Please provide either an email or a user_id.';

      try {
        await teamManagementService.inviteTeamMember(userDummy.id, {
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

    it('negative: if team payment_type is OFFLINE and capacity is full, error should be thrown', async () => {
      TeamRepositoryMock.orm.findOneBy.mockResolvedValue({
        ...TeamWithMembersDummy,
        payment_type: PaymentType.OFFLINE,
        team_size: 1,
        team_size_limit: 1,
      });
      TeamToMemberRepositoryMock.orm.find.mockResolvedValue([TeamMemberDummy]);
      UserRepositoryMock.orm.findOne.mockResolvedValue(userDummy);
      Auth0ManagementServiceMock.getAuth0User.mockResolvedValue(auth0UserDummy);

      let exception;
      const errorMessage = `Unable to invite more members to team with ID: ${TeamWithMembersDummy.id}, maximum capacity reached!`;

      try {
        await teamManagementService.inviteTeamMember(userDummy.id, inviteTeamMemberDtoDummy);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeInstanceOf(BadRequestException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: jwt should be created with email and admin_id in payload', async () => {
      TeamRepositoryMock.orm.findOneBy.mockResolvedValueOnce({
        ...TeamWithMembersDummy,
        payment_type: PaymentType.OFFLINE,
        team_size: 1,
        team_size_limit: 5,
      });
      TeamToMemberRepositoryMock.orm.find.mockResolvedValueOnce([TeamMemberDummy]);
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(newUser);
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(newUser);
      Auth0ManagementServiceMock.getAuth0User.mockResolvedValue({ ...auth0UserDummy, email: auth0NewUserEmail });
      TeamToMemberRepositoryMock.orm.findOne.mockResolvedValueOnce(null);
      TeamToMemberRepositoryMock.orm.create.mockResolvedValueOnce(unregisteredNewMember);
      TeamToMemberRepositoryMock.orm.save.mockResolvedValueOnce({});
      ConfigServiceMock.get.mockReturnValueOnce('test-secret');

      await teamManagementService.inviteTeamMember(userDummy.id, inviteTeamMemberDtoDummy);

      const { user_id, ...rest } = inviteTeamMemberDtoDummy;
      expect(JwtServiceMock.asyncSign).toBeCalledWith(
        {
          ...rest,
          admin_id: userDummy.id,
          team_name: TeamWithMembersDummy.name,
        },
        'test-secret',
      );
    });

    it('positive: email should be sent with invitation link inside', async () => {
      TeamRepositoryMock.orm.findOneBy.mockResolvedValueOnce({
        ...TeamWithMembersDummy,
        payment_type: PaymentType.OFFLINE,
        team_size: 1,
        team_size_limit: 5,
      });
      TeamToMemberRepositoryMock.orm.find.mockResolvedValueOnce([TeamMemberDummy]);
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(newUser);
      Auth0ManagementServiceMock.getAuth0User.mockResolvedValue({ ...auth0UserDummy, email: auth0NewUserEmail });
      TeamToMemberRepositoryMock.orm.findOneBy.mockResolvedValueOnce(null);
      TeamToMemberRepositoryMock.orm.create.mockResolvedValueOnce(unregisteredNewMember);
      TeamToMemberRepositoryMock.orm.save.mockResolvedValueOnce({});
      ConfigServiceMock.get.mockReturnValueOnce('test-secret').mockReturnValueOnce('https://dashboard.local.dev:3000');
      JwtServiceMock.asyncSign.mockResolvedValueOnce('nekot');
      await teamManagementService.inviteTeamMember(userDummy.id, inviteTeamMemberDtoDummy, origin);

      expect(SendGridServiceMock.sendEmail).toBeCalledWith({
        to: inviteTeamMemberDtoDummy.email,
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

  // // TODO: Implement unit tests for acceptInvitation function

  describe('assignMemberAsAdmin', () => {
    it('negative: if user is already admin member of team, error should be thrown', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(TeamMemberDummy);
      TeamRepositoryMock.findActiveTeamWithMembers.mockResolvedValueOnce({
        team: TeamWithMembersDummy,
        admins: [userDummy, TeamMemberDummy],
      });
      let exception;
      const errorMessage = `User with ID: ${TeamMemberDummy.id} is already an admin member of team with ID: ${TeamWithMembersDummy.id}!`;

      try {
        await teamManagementService.assignExistingMemberAsAdmin(
          userDummy.id,
          TeamMemberDummy.id,
          TeamWithMembersDummy.id,
        );
      } catch (error) {
        exception = error;
      }

      expect(exception.message).toEqual(errorMessage);
      expect(exception).toBeInstanceOf(BadRequestException);
    });

    it('positive: member should be saved as admin and granted admin entitlement in RC', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(TeamMemberDummy);
      TeamRepositoryMock.findActiveTeamWithMembers.mockResolvedValueOnce({
        team: TeamWithMembersDummy,
        admins: [userDummy],
      });

      await teamManagementService.assignExistingMemberAsAdmin(
        userDummy.id,
        TeamMemberDummy.id,
        TeamWithMembersDummy.id,
      );

      expect(RevenueCatServiceMock.grantTeamMembership).toBeCalledWith(TeamMemberDummy.id, Entitlement.team_admin);
      expect(TeamToAdminRepositoryMock.orm.save).toBeCalledWith(
        new TeamToAdmin({ team_id: TeamWithMembersDummy.id, admin_id: TeamMemberDummy.id }),
      );
    });
  });

  describe('removeMember', () => {
    it('negative: throw bad request error if user is not found in the team', async () => {
      TeamRepositoryMock.getTeamIncludingUnregistered.mockResolvedValueOnce({
        team: TeamWithMembersDummy,
        members: [TeamMemberDummy],
      });

      const errorMessage = `User with member_id: ${newUser.id} does not exist in the team (team_id: ${TeamWithMembersDummy.id}).`;
      let exception: any;

      try {
        await teamManagementService.removeMember(
          { member_id: newUser.id, team_id: TeamWithMembersDummy.id },
          userDummy.id,
        );
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(BadRequestException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: should remove member from the team', async () => {
      TeamRepositoryMock.getTeamIncludingUnregistered.mockResolvedValueOnce({
        team: TeamWithMembersDummy,
        members: [TeamMemberDummy, TeamMemberFake],
      });
      TeamToMemberRepositoryMock.orm.find.mockResolvedValueOnce([TeamWithMembersDummy]);

      await teamManagementService.removeMember(
        { member_id: TeamMemberDummy.member_id, team_id: TeamWithMembersDummy.id },
        userDummy.id,
      );

      expect(TeamRepositoryMock.update).toBeCalledWith(TeamWithMembersDummy.id, { team_size: 1 });
    });

    it('positive: stripe subscription should be updated to decrease team size', async () => {
      TeamRepositoryMock.getTeamIncludingUnregistered.mockResolvedValueOnce({
        team: TeamWithMembersDummy,
        members: [TeamMemberDummy, TeamMemberFake],
      });
      TeamToMemberRepositoryMock.orm.find.mockResolvedValueOnce([TeamWithMembersDummy]);

      const {
        stripe_data: { subscriptionId, subscriptionItemId },
      } = TeamWithMembersDummy;

      await teamManagementService.removeMember(
        { member_id: TeamMemberDummy.member_id, team_id: TeamWithMembersDummy.id },
        userDummy.id,
      );

      expect(StripeServiceMock.updateSubscription).toBeCalledWith(subscriptionId, subscriptionItemId, 1);
    });

    it('positive: if team payment_type if OFFLINE, team size should be updated in DB, but not in Stripe', async () => {
      TeamRepositoryMock.getTeamIncludingUnregistered.mockResolvedValueOnce({
        team: { ...TeamWithMembersDummy, payment_type: PaymentType.OFFLINE },
        members: [TeamMemberDummy, TeamMemberFake],
      });
      TeamToMemberRepositoryMock.orm.find.mockResolvedValueOnce([TeamWithMembersDummy]);

      await teamManagementService.removeMember(
        { member_id: TeamMemberDummy.member_id, team_id: TeamWithMembersDummy.id },
        userDummy.id,
      );

      expect(TeamRepositoryMock.update).toBeCalledWith(TeamWithMembersDummy.id, { team_size: 1 });
      expect(StripeServiceMock.updateSubscription).not.toBeCalled();
    });
  });

  describe('removeMemberAsAdmin', () => {
    it('positive: member should be removed as admin and admin entitlement should be revoked in RC', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce({
        ...TeamMemberDummy,
        admin_of_teams: [TeamWithMembersDummy],
      });
      TeamRepositoryMock.findActiveTeamWithMembers.mockResolvedValueOnce({
        team: {
          ...TeamWithMembersDummy,
        },
      });
      TeamToAdminRepositoryMock.orm.find.mockResolvedValueOnce([TeamWithMembersDummy, TeamWithMembersDummy]);

      await teamManagementService.removeMemberAsAdmin(userDummy.id, TeamMemberDummy.id, TeamWithMembersDummy.id);

      expect(RevenueCatServiceMock.revokeTeamMembership).toBeCalledWith(TeamMemberDummy.id, Entitlement.team_admin);
      expect(TeamToAdminRepositoryMock.orm.delete).toBeCalledWith({
        team_id: TeamWithMembersDummy.id,
        admin_id: TeamMemberDummy.id,
      });
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

      expect(UserRepositoryMock.orm.save).toBeCalled();
    });
  });

  describe('updateTeamSize', () => {
    it('negative: should throw not found exception if user is not found in DB', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(null);
      TeamRepositoryMock.findActiveTeamWithMembers.mockResolvedValueOnce({ team: TeamWithMembersDummy });

      const errorMessage = `User with ID: ${userDummy.id} does not exist!`;
      let exception: any;

      try {
        await teamManagementService.updateTeamSize(userDummy.id, TeamWithMembersDummy.id, 3);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('negative: should throw not found exception if team is not found in DB', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      TeamRepositoryMock.findActiveTeamWithMembers.mockResolvedValueOnce({ team: null });

      const errorMessage = `Team with ID: ${TeamWithMembersDummy.id} does not exist!`;
      let exception: any;

      try {
        await teamManagementService.updateTeamSize(userDummy.id, TeamWithMembersDummy.id, 3);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: should update team size in stripe', async () => {
      TeamRepositoryMock.findActiveTeamWithMembers.mockResolvedValueOnce({ team: TeamWithMembersDummy });
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      const {
        stripe_data: { subscriptionId, subscriptionItemId },
      } = TeamWithMembersDummy;

      await teamManagementService.updateTeamSize(userDummy.id, TeamWithMembersDummy.id, 3);

      expect(StripeServiceMock.updateSubscription).toBeCalledWith(subscriptionId, subscriptionItemId, 3);
    });
  });

  describe('getAllTeamMembers', () => {
    it('positive: should get members, admins of team with last 90 days DailyStats', async () => {
      TeamRepositoryMock.getTeamIncludingUnregistered.mockResolvedValueOnce({
        team: TeamWithMembersDummy,
        members: [TeamMemberDummy, TeamMemberFake],
        admins: [TeamWithMembersDummy.owner_id],
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

      const response = await teamManagementService.getAllTeamMembers(userDummy.id, TeamWithMembersDummy.id);

      expect(response.admins).toHaveLength(1);
      expect(response.members).toHaveLength(2);
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

      expect(RevenueCatServiceMock.revokeTeamMembership).toBeCalledWith(memberTwoId, Entitlement.team_member);
    });
  });

  describe('revokeAdminMembersEntitlements', () => {
    it('positive: should revoke members team_admin entitlements in revenue cat if member is part of only one team', async () => {
      const memberOneId = randomUUID();
      const memberTwoId = randomUUID();
      const teamOneId = randomUUID();
      const teamTwoId = randomUUID();
      TeamRepositoryMock.orm.findOne.mockResolvedValueOnce(TeamWithMembersDummy);
      TeamRepositoryMock.getTeamAdmins.mockResolvedValueOnce([{ id: memberOneId }, { id: memberTwoId }]);
      TeamToAdminRepositoryMock.orm.find.mockResolvedValueOnce([{ id: teamOneId }, { id: teamTwoId }]);
      TeamToAdminRepositoryMock.orm.find.mockResolvedValueOnce([{ id: teamOneId }]);

      await teamManagementService.revokeAdminMembersEntitlements('sub_1234');

      expect(RevenueCatServiceMock.revokeTeamMembership).toBeCalledWith(memberTwoId, Entitlement.team_admin);
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

      expect(RevenueCatServiceMock.revokeTeamMembership).toBeCalledWith(ownerId, Entitlement.team_owner);
    });

    it("positive: should NOT revoke owner of team's team_owner entitlement in revenue cat if member is owner of multiple teams", async () => {
      const ownerId = randomUUID();
      const teamOneId = randomUUID();
      const teamTwoId = randomUUID();
      TeamRepositoryMock.orm.findOne.mockResolvedValueOnce({
        owner: { id: ownerId, owned_teams: [{ id: teamOneId }, { id: teamTwoId }] },
      });

      await teamManagementService.revokeOwnerEntitlement('sub_1234');

      expect(RevenueCatServiceMock.revokeTeamMembership).not.toBeCalled();
    });
  });

  describe('reassignTeamMembersEntitlements', () => {
    it('positive: should assign team member entitlements for team members in revenue cat', async () => {
      const memberOneId = randomUUID();
      const memberTwoId = randomUUID();
      TeamRepositoryMock.orm.findOne.mockResolvedValueOnce({
        members: [{ id: memberOneId }, { id: memberTwoId }],
      });
      TeamRepositoryMock.getTeamMembers.mockResolvedValueOnce([
        { ...TeamMemberDummy, id: memberOneId },
        { ...TeamMemberDummy, id: memberTwoId },
      ]);

      await teamManagementService.reassignTeamMembersEntitlements('sub_1234');

      expect(RevenueCatServiceMock.grantTeamMembership).toBeCalledWith(memberOneId, Entitlement.team_member);
      expect(RevenueCatServiceMock.grantTeamMembership).toBeCalledWith(memberTwoId, Entitlement.team_member);
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

      expect(TeamRepositoryMock.orm.save).toBeCalledWith(
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

      expect(TeamRepositoryMock.orm.save).toBeCalledWith(
        new Team({ ...TeamWithMembersDummy, is_active: false, stripe_subscription_id: null, stripe_data: null }),
      );
    });
  });

  // TODO: Implement unit tests for getAdminUserTeams function

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
      TeamRepositoryMock.findActiveTeamWithMembers.mockResolvedValueOnce({ team: TeamWithMembersDummy });
      TeamRepositoryMock.getTeamMembers.mockResolvedValueOnce([{ id: memberOneId }, { id: memberTwoId }]);
      TeamToMemberRepositoryMock.orm.find.mockResolvedValueOnce([{ id: teamOneId }, { id: teamTwoId }]);
      TeamToMemberRepositoryMock.orm.find.mockResolvedValueOnce([{ id: teamOneId }]);
      TeamRepositoryMock.getTeamAdmins.mockResolvedValueOnce([{ id: memberOneId }, { id: memberTwoId }]);
      TeamToAdminRepositoryMock.orm.find.mockResolvedValueOnce([{ id: teamOneId }, { id: teamTwoId }]);
      TeamToAdminRepositoryMock.orm.find.mockResolvedValueOnce([{ id: teamOneId }]);
      TeamRepositoryMock.orm.findOne.mockResolvedValueOnce({
        owner: { id: ownerId, owned_teams: [{ id: teamOneId }] },
      });

      await teamManagementService.deleteTeam(userDummy.id, TeamWithMembersDummy.id);

      expect(TeamRepositoryMock.orm.delete).toBeCalledWith({ id: TeamWithMembersDummy.id });
      expect(StripeServiceMock.cancelSubscription).toBeCalledWith(TeamWithMembersDummy.stripe_subscription_id);
    });
  });

  describe('updateMemberExpiryDate', () => {
    it('negative: should throw bad request exception if member is not linked to team', async () => {
      const newExpiryDate = new Date('2023-11-18');
      TeamRepositoryMock.findActiveTeamWithMembers.mockResolvedValueOnce({ team: TeamWithMembersDummy });
      // mock no linked member record to be found
      TeamToMemberRepositoryMock.orm.findOne.mockResolvedValueOnce(null);
      let exception;
      const errorMessage = `User with ID: ${TeamMemberDummy.id} is not a member of team with ID: ${TeamWithMembersDummy.id}!`;

      try {
        await teamManagementService.updateMemberExpiryDate(userDummy.id, {
          team_id: TeamWithMembersDummy.id,
          member_id: TeamMemberDummy.id,
          expiry_date: newExpiryDate,
        });
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeInstanceOf(BadRequestException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: should save linked member record with new expiry date', async () => {
      const newExpiryDate = new Date('2023-11-18');
      const linkedMemberRecordDummy = new TeamToMember({
        team_id: TeamWithMembersDummy.id,
        member_id: TeamMemberDummy.id,
        member_expiry_date: new Date('2023-11-15'),
      });
      TeamRepositoryMock.findActiveTeamWithMembers.mockResolvedValueOnce({ team: TeamWithMembersDummy });
      TeamToMemberRepositoryMock.orm.findOne.mockResolvedValueOnce(linkedMemberRecordDummy);

      await teamManagementService.updateMemberExpiryDate(userDummy.id, {
        team_id: TeamWithMembersDummy.id,
        member_id: TeamMemberDummy.id,
        expiry_date: newExpiryDate,
      });

      expect(TeamToMemberRepositoryMock.orm.save).toBeCalledWith({
        ...linkedMemberRecordDummy,
        member_expiry_date: newExpiryDate,
      });
    });
  });

  describe('addTeamMemberManually', () => {
    it('negative: if team not found, throw the NotFoundException', async () => {
      TeamRepositoryMock.orm.findOneBy.mockResolvedValueOnce(null);

      let exception;
      const errorMessage = `The team with id: ${TeamWithMembersDummy.id} doesn't exists!`;

      try {
        await teamManagementService.addTeamMemberManually(TeamWithMembersDummy.owner_id, {
          team_id: TeamWithMembersDummy.id,
          user_id: userDummy.id,
        });
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('negative: if user registration not found in DB, throw the NotFoundException', async () => {
      TeamRepositoryMock.orm.findOneBy.mockResolvedValueOnce(TeamWithMembersDummy);
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(null);

      let exception;
      const errorMessage = `The user with id: ${userDummy.id} doesn't exists!`;

      try {
        await teamManagementService.addTeamMemberManually(TeamWithMembersDummy.owner_id, {
          team_id: TeamWithMembersDummy.id,
          user_id: userDummy.id,
        });
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('negative: if user registration not found in auth0, throw the NotFoundException', async () => {
      TeamRepositoryMock.orm.findOneBy.mockResolvedValueOnce(TeamWithMembersDummy);
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      Auth0ManagementServiceMock.getAuth0User.mockResolvedValueOnce(null);

      let exception;
      const errorMessage = `The user with id: ${userDummy.id} and auth0_id: ${userDummy.auth0_id} does not exists in auth0!`;

      try {
        await teamManagementService.addTeamMemberManually(TeamWithMembersDummy.owner_id, {
          team_id: TeamWithMembersDummy.id,
          user_id: userDummy.id,
        });
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: user with team association should be saved in the DB and the membership entitlement need to be granted via RevenueCat', async () => {
      const newMember = { ...TeamMemberDummy, id: randomUUID() };
      TeamRepositoryMock.orm.findOneBy.mockResolvedValueOnce({
        ...TeamWithMembersDummy,
        team_size: 1,
        team_size_limit: 10,
      });
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(newMember);
      Auth0ManagementServiceMock.getAuth0User.mockResolvedValueOnce(auth0UserDummy);

      TeamToMemberRepositoryMock.orm.findOne.mockResolvedValue(null);
      TeamToMemberRepositoryMock.orm.create.mockImplementation((args) => args);

      TeamRepositoryMock.getTeamIncludingUnregistered.mockResolvedValue({
        team: TeamWithMembersDummy,
        members: [TeamMemberDummy],
      });

      await teamManagementService.addTeamMemberManually(TeamWithMembersDummy.owner_id, {
        team_id: TeamWithMembersDummy.id,
        user_id: newMember.id,
      });

      expect(TeamToMemberRepositoryMock.orm.save).toBeCalledWith({
        member_id: newMember.id,
        team_id: TeamWithMembersDummy.id,
        first_name: auth0UserDummy.given_name,
        last_name: auth0UserDummy.family_name,
        email: auth0UserDummy.email,
        invitation_status: InvitationStatus.ACCEPTED,
        invitation_responded_at: new Date(),
        invitation_sent_at: new Date(),
        invitation_send_count: 1,
        member_expiry_date: TeamWithMembersDummy.expires_date as Date,
      });
      expect(RevenueCatServiceMock.grantTeamMembership).toBeCalledWith(newMember.id, Entitlement.team_member);
    });
  });
});
