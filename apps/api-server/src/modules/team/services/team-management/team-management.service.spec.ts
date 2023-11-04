import { RevenueCatService } from '@app/revenue-cat';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import { SendGridService } from '@app/send-grid';
import { JwtService } from '@app/jwt';
import { StripeService } from '@app/stripe';
import { TeamMemberDummy, TeamWithMembersDummy, userDummy } from '../../../../../test/dummies';
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
} from '../../../../../test/mocks';
import { UserRepository } from '../../../user/repositories/user.repository';
import { TeamRepository } from '../../repositories/team.repository';
import { TeamManagementService } from './team-management.service';
import { EMAIL_TEMPLATE_IDS, FOCUS_BEAR_EMAILS } from '../../../../shared/utils/constants';
import { Auth0ManagementService } from '../../../../../../../libs/auth0/src';
import { Entitlement } from '../../../subscription/domain/entitlement.enum';
import { Team } from '../../entities/team.entity';

describe('TeamManagementService', () => {
  let teamManagementService: TeamManagementService;
  process.env = { JWT_INVITATION_SECRET: 'test-secret' };

  beforeEach(async () => {
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
        {
          provide: SENTRY_TOKEN,
          useValue: SentryServiceMock,
        },
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
      .compile();

    jest.clearAllMocks();
    jest.resetAllMocks();

    teamManagementService = moduleRef.get<TeamManagementService>(TeamManagementService);
  });

  it('should be defined', () => {
    expect(teamManagementService).toBeDefined();
  });

  describe('addTeamMember', () => {
    it('negative: if user does not exist in DB, throw the NotFoundException', async () => {
      const user_id = randomUUID();
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(null);
      const errorMessage = `The User with id: ${user_id} does not exist!`;
      let exception: any;

      try {
        await teamManagementService.addTeamMember(user_id, TeamWithMembersDummy.owner_id, TeamWithMembersDummy.id);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('negative: if user already participates that team, throw the BadRequestException', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(TeamMemberDummy);
      TeamRepositoryMock.findActiveTeamWithMembers.mockResolvedValueOnce(TeamWithMembersDummy);
      let exception: any;

      try {
        await teamManagementService.addTeamMember(
          TeamMemberDummy.id,
          TeamWithMembersDummy.owner_id,
          TeamWithMembersDummy.id,
        );
      } catch (error) {
        exception = error;
      }

      const errorMessage = `User with ID ${TeamMemberDummy.id} is already in team with ID: ${TeamWithMembersDummy.id}`;
      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(BadRequestException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: user with team association should be saved in the DB and the membership entitlement need to be granted via RevenueCat', async () => {
      const newMember = { ...TeamMemberDummy, id: randomUUID() };
      UserRepositoryMock.orm.findOneBy.mockResolvedValue(userDummy);
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce({ ...newMember, member_of_teams: [] });
      TeamRepositoryMock.findActiveTeamWithMembers.mockResolvedValue(TeamWithMembersDummy);

      await teamManagementService.addTeamMember(newMember.id, TeamWithMembersDummy.owner_id, TeamWithMembersDummy.id);

      expect(UserRepositoryMock.orm.save).toBeCalledWith({ ...newMember, member_of_teams: [TeamWithMembersDummy] });
      expect(RevenueCatServiceMock.grantTeamMembership).toBeCalledWith(newMember.id, Entitlement.team_member);
    });

    it('positive: Stripe subscription should be updated to increment team size', async () => {
      const newMember = { ...TeamMemberDummy, id: randomUUID() };
      UserRepositoryMock.orm.findOneBy.mockResolvedValue(userDummy);
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce({ ...newMember, member_of_teams: [] });
      TeamRepositoryMock.findActiveTeamWithMembers.mockResolvedValue({ ...TeamWithMembersDummy, members: [userDummy] });
      const {
        stripe_data: { subscriptionId, subscriptionItemId },
      } = TeamWithMembersDummy;

      await teamManagementService.addTeamMember(newMember.id, TeamWithMembersDummy.owner_id, TeamWithMembersDummy.id);

      expect(StripeServiceMock.updateSubscription).toBeCalledWith(subscriptionId, subscriptionItemId, 2);
    });
  });

  describe('bulkDeleteTeamMembers', () => {
    it('negative: if team does not exist in DB, throw the NotFoundException', async () => {
      const owner_id = randomUUID();
      const member_ids = [randomUUID()];
      TeamRepositoryMock.findActiveTeamWithMembers.mockResolvedValueOnce(null);
      let exception: any;

      try {
        await teamManagementService.bulkDeleteTeamMembers(member_ids, owner_id, TeamWithMembersDummy.id);
      } catch (error) {
        exception = error;
      }

      const errorMessage = `The Team with owner_id: ${owner_id} does not exist or is inactive!`;
      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: user should be disassociated from the team in the DB and the membership entitlement needs to be revoked via RevenueCat', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(TeamMemberDummy);
      TeamRepositoryMock.findActiveTeamWithMembers.mockResolvedValue(TeamWithMembersDummy);
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);

      await teamManagementService.bulkDeleteTeamMembers(
        [TeamMemberDummy.id],
        TeamWithMembersDummy.owner_id,
        TeamWithMembersDummy.id,
      );

      expect(UserRepositoryMock.orm.save).toBeCalledWith({ ...TeamMemberDummy, member_of_teams: [] });
      expect(RevenueCatServiceMock.revokeTeamMembership).toBeCalledWith(TeamMemberDummy.id, Entitlement.team_member);
    });
  });

  describe('inviteTeamMember', () => {
    const email = 'test@gamil.com';

    it('positive: jwt should be created with email and owner_id in payload', async () => {
      TeamRepositoryMock.findActiveTeamWithMembers.mockResolvedValue(TeamWithMembersDummy);
      Auth0ManagementServiceMock.getAuth0UserWithEmail.mockResolvedValueOnce([]);
      ConfigServiceMock.get.mockReturnValueOnce('test-secret');

      await teamManagementService.inviteTeamMember(email, userDummy.id, TeamWithMembersDummy.id);

      expect(JwtServiceMock.asyncSign).toBeCalledWith(
        {
          email,
          admin_id: userDummy.id,
          team_id: TeamWithMembersDummy.id,
        },
        'test-secret',
      );
    });

    it('positive: email should be sent with invitation link inside', async () => {
      const singedJwt = 'some.test.jwt.string';
      TeamRepositoryMock.findActiveTeamWithMembers.mockResolvedValue(TeamWithMembersDummy);
      JwtServiceMock.asyncSign.mockResolvedValue(singedJwt);
      Auth0ManagementServiceMock.getAuth0UserWithEmail.mockResolvedValueOnce([]);

      await teamManagementService.inviteTeamMember(email, userDummy.id, TeamWithMembersDummy.id);

      expect(SendGridServiceMock.sendEmail).toBeCalledWith({
        to: email,
        from: FOCUS_BEAR_EMAILS.MARKETING,
        templateId: EMAIL_TEMPLATE_IDS.TEAM_INVITE,
        dynamicTemplateData: {
          invite_url: expect.toInclude(`?token=${singedJwt}`),
          team_name: TeamWithMembersDummy.name,
        },
      });
    });
  });

  describe('assignMemberAsAdmin', () => {
    it('positive: member should be saved as admin and granted admin entitlement in RC', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce({ ...TeamMemberDummy, admin_of_teams: [] });
      TeamRepositoryMock.findActiveTeamWithMembers.mockResolvedValueOnce(TeamWithMembersDummy);

      await teamManagementService.assignMemberAsAdmin(userDummy.id, TeamMemberDummy.id, TeamWithMembersDummy.id);

      expect(UserRepositoryMock.orm.save).toBeCalledWith({
        ...TeamMemberDummy,
        admin_of_teams: [TeamWithMembersDummy],
      });
      expect(RevenueCatServiceMock.grantTeamMembership).toBeCalledWith(TeamMemberDummy.id, Entitlement.team_admin);
    });
  });

  describe('removeMember', () => {
    it('negative: throw bad request error if trying to remove owner from the team', async () => {
      TeamRepositoryMock.findActiveTeamWithMembers.mockResolvedValueOnce(TeamWithMembersDummy);

      const errorMessage = `Can't remove owner from team with ID: ${TeamWithMembersDummy.id}. Owner ID: ${userDummy.id}`;
      let exception: any;

      try {
        await teamManagementService.removeMember(userDummy.id, userDummy.id, TeamWithMembersDummy.id);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(BadRequestException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: should remove member from the team', async () => {
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce({
        ...TeamMemberDummy,
        member_of_teams: [TeamWithMembersDummy],
      });
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      TeamRepositoryMock.findActiveTeamWithMembers.mockResolvedValue(TeamWithMembersDummy);

      await teamManagementService.removeMember(userDummy.id, TeamMemberDummy.id, TeamWithMembersDummy.id);

      expect(UserRepositoryMock.orm.save).toBeCalledWith({ ...TeamMemberDummy, member_of_teams: [] });
    });

    it('positive: stripe subscription should be updated to decrease team size', async () => {
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce({
        ...TeamMemberDummy,
        member_of_teams: [TeamWithMembersDummy],
      });
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      TeamRepositoryMock.findActiveTeamWithMembers.mockResolvedValue(TeamWithMembersDummy);
      const {
        stripe_data: { subscriptionId, subscriptionItemId },
      } = TeamWithMembersDummy;

      await teamManagementService.removeMember(userDummy.id, TeamMemberDummy.id, TeamWithMembersDummy.id);

      expect(StripeServiceMock.updateSubscription).toBeCalledWith(subscriptionId, subscriptionItemId, 1);
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
        ...TeamWithMembersDummy,
        admin_members: [userDummy, TeamMemberDummy],
      });

      await teamManagementService.removeMemberAsAdmin(userDummy.id, TeamMemberDummy.id, TeamWithMembersDummy.id);

      expect(UserRepositoryMock.orm.save).toBeCalledWith({
        ...TeamMemberDummy,
        admin_of_teams: [],
      });
      expect(RevenueCatServiceMock.revokeTeamMembership).toBeCalledWith(TeamMemberDummy.id, Entitlement.team_admin);
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
      };
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);

      await teamManagementService.registerTeam(createSubscriptionPayloadDummy);

      expect(UserRepositoryMock.orm.save).toBeCalledWith(
        new Team({
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
          admin_members: [userDummy],
          members: [userDummy],
          expires_date: new Date(createSubscriptionPayloadDummy.current_period_end * 1000),
        }),
      );
    });
  });

  describe('updateTeamSize', () => {
    it('negative: should throw not found exception if user is not found in DB', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(null);

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
      TeamRepositoryMock.findActiveTeamWithMembers.mockResolvedValueOnce(null);

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
      TeamRepositoryMock.findActiveTeamWithMembers.mockResolvedValueOnce(TeamWithMembersDummy);
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      const {
        stripe_data: { subscriptionId, subscriptionItemId },
      } = TeamWithMembersDummy;

      await teamManagementService.updateTeamSize(userDummy.id, TeamWithMembersDummy.id, 3);

      expect(StripeServiceMock.updateSubscription).toBeCalledWith(subscriptionId, subscriptionItemId, 3);
    });
  });

  describe('getAllTeamMembers', () => {
    it('positive: should get members and admin of team, get their emails from auth0 and return the users', async () => {
      TeamRepositoryMock.findActiveTeamWithMembers.mockResolvedValueOnce(TeamWithMembersDummy);
      Auth0ManagementServiceMock.getAuth0User.mockResolvedValue({ email: 'test@mail.com' });

      const response = await teamManagementService.getAllTeamMembers(userDummy.id, TeamWithMembersDummy.id);

      expect(response.admin).toHaveLength(1);
      expect(response.members).toHaveLength(2);
    });
  });

  describe('revokeTeamMembersEntitlements', () => {
    it('positive: should revoke members team_member entitlements in revenue cat if member is part of only one team', async () => {
      const memberOneId = randomUUID();
      const memberTwoId = randomUUID();
      const teamOneId = randomUUID();
      const teamTwoId = randomUUID();
      TeamRepositoryMock.orm.findOne.mockResolvedValueOnce({
        members: [
          { id: memberOneId, member_of_teams: [{ id: teamOneId }, { id: teamTwoId }] },
          { id: memberTwoId, member_of_teams: [{ id: teamOneId }] },
        ],
      });

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
      TeamRepositoryMock.orm.findOne.mockResolvedValueOnce({
        members: [
          { id: memberOneId, admin_of_teams: [{ id: teamOneId }, { id: teamTwoId }] },
          { id: memberTwoId, admin_of_teams: [{ id: teamOneId }] },
        ],
      });

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
      TeamRepositoryMock.orm.findOne.mockResolvedValueOnce(TeamWithMembersDummy);
      const memberOneId = randomUUID();
      const memberTwoId = randomUUID();
      const teamOneId = randomUUID();
      const teamTwoId = randomUUID();
      TeamRepositoryMock.orm.findOne.mockResolvedValueOnce({
        members: [
          { id: memberOneId, member_of_teams: [{ id: teamOneId }, { id: teamTwoId }] },
          { id: memberTwoId, member_of_teams: [{ id: teamOneId }] },
        ],
      });

      await teamManagementService.handleTeamSubscriptionCancelled('sub_123');

      expect(TeamRepositoryMock.orm.save).toBeCalledWith(
        new Team({ ...TeamWithMembersDummy, is_active: false, stripe_subscription_id: null, stripe_data: null }),
      );
    });
  });

  describe('deleteTeam', () => {
    it('positive: owner and members entitlements should be revoked and team should be deleted', async () => {
      TeamRepositoryMock.findActiveTeamWithMembers.mockResolvedValueOnce(TeamWithMembersDummy);
      const memberOneId = randomUUID();
      const memberTwoId = randomUUID();
      const teamOneId = randomUUID();
      const teamTwoId = randomUUID();
      const ownerId = randomUUID();
      TeamRepositoryMock.orm.findOne.mockResolvedValueOnce({
        members: [
          { id: memberOneId, member_of_teams: [{ id: teamOneId }, { id: teamTwoId }] },
          { id: memberTwoId, member_of_teams: [{ id: teamOneId }] },
        ],
      });
      TeamRepositoryMock.orm.findOne.mockResolvedValueOnce({
        members: [
          { id: memberOneId, admin_of_teams: [{ id: teamOneId }, { id: teamTwoId }] },
          { id: memberTwoId, admin_of_teams: [{ id: teamOneId }] },
        ],
      });
      TeamRepositoryMock.orm.findOne.mockResolvedValueOnce({
        owner: { id: ownerId, owned_teams: [{ id: teamOneId }] },
      });

      await teamManagementService.deleteTeam(userDummy.id, TeamWithMembersDummy.id);

      expect(TeamRepositoryMock.orm.delete).toBeCalledWith({ id: TeamWithMembersDummy.id });
      expect(StripeServiceMock.cancelSubscription).toBeCalledWith(TeamWithMembersDummy.stripe_subscription_id);
    });
  });
});
