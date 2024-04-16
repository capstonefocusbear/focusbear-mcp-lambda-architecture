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
  TeamToMemberRepositoryMock,
  TeamToAdminRepositoryMock,
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

describe('TeamManagementService', () => {
  let teamManagementService: TeamManagementService;
  process.env = { JWT_INVITATION_SECRET: 'test-secret' };
  const firstName = 'first';
  const lastName = 'last';
  const expiryDate = new Date('2023-11-16');

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
        TeamToMemberRepository,
        TeamToAdminRepository,
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
      .overrideProvider(TeamToMemberRepository)
      .useValue(TeamToMemberRepositoryMock)
      .overrideProvider(TeamToAdminRepository)
      .useValue(TeamToAdminRepositoryMock)
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
      TeamRepositoryMock.findActiveTeamWithMembers.mockResolvedValueOnce({
        team: TeamWithMembersDummy,
        members: [userDummy],
      });
      const errorMessage = `The User with id: ${user_id} does not exist!`;
      let exception: any;

      try {
        await teamManagementService.addTeamMember(
          user_id,
          TeamWithMembersDummy.owner_id,
          TeamWithMembersDummy.id,
          firstName,
          lastName,
          expiryDate,
        );
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
      TeamRepositoryMock.findActiveTeamWithMembers.mockResolvedValueOnce({
        team: TeamWithMembersDummy,
        members: [userDummy, TeamMemberDummy],
      });
      let exception: any;

      try {
        await teamManagementService.addTeamMember(
          TeamMemberDummy.id,
          TeamWithMembersDummy.owner_id,
          TeamWithMembersDummy.id,
          firstName,
          lastName,
          expiryDate,
        );
      } catch (error) {
        exception = error;
      }

      const errorMessage = `User with ID ${TeamMemberDummy.id} is already in team with ID: ${TeamWithMembersDummy.id}`;
      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(BadRequestException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('negative: if team payment type is OFFLINE and maximum capacity has been reached, error should be thrown to avoid user from being added to team', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(TeamMemberDummy);
      TeamRepositoryMock.findActiveTeamWithMembers.mockResolvedValueOnce({
        team: { ...TeamWithMembersDummy, payment_type: PaymentType.OFFLINE, team_size: 2, team_size_limit: 2 },
        members: [userDummy],
      });
      let exception: any;

      try {
        await teamManagementService.addTeamMember(
          TeamMemberDummy.id,
          TeamWithMembersDummy.owner_id,
          TeamWithMembersDummy.id,
          firstName,
          lastName,
          expiryDate,
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
      const newMember = { ...TeamMemberDummy, id: randomUUID() };
      UserRepositoryMock.orm.findOneBy.mockResolvedValue(userDummy);
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce({ ...newMember, member_of_teams: [] });
      TeamRepositoryMock.findActiveTeamWithMembers.mockResolvedValue({
        team: TeamWithMembersDummy,
        members: [userDummy],
      });

      await teamManagementService.addTeamMember(
        newMember.id,
        TeamWithMembersDummy.owner_id,
        TeamWithMembersDummy.id,
        firstName,
        lastName,
        expiryDate,
      );

      expect(TeamToMemberRepositoryMock.orm.save).toBeCalledWith(
        new TeamToMember({
          member_id: newMember.id,
          team_id: TeamWithMembersDummy.id,
          first_name: firstName,
          last_name: lastName,
          member_expiry_date: expiryDate,
        }),
      );
      expect(RevenueCatServiceMock.grantTeamMembership).toBeCalledWith(newMember.id, Entitlement.team_member);
    });

    it('positive: Stripe subscription should be updated to increment team size', async () => {
      const newMember = { ...TeamMemberDummy, id: randomUUID() };
      UserRepositoryMock.orm.findOneBy.mockResolvedValue(userDummy);
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce({ ...newMember, member_of_teams: [] });
      TeamRepositoryMock.findActiveTeamWithMembers.mockResolvedValue({
        team: { ...TeamWithMembersDummy },
        members: [userDummy],
      });
      const {
        stripe_data: { subscriptionId, subscriptionItemId },
      } = TeamWithMembersDummy;

      await teamManagementService.addTeamMember(
        newMember.id,
        TeamWithMembersDummy.owner_id,
        TeamWithMembersDummy.id,
        firstName,
        lastName,
        expiryDate,
      );

      expect(StripeServiceMock.updateSubscription).toBeCalledWith(subscriptionId, subscriptionItemId, 2);
    });

    it('positive: if team payment_type is OFFLINE and team has open spaces, team size should be updated in DB, but not in Stripe', async () => {
      const newMember = { ...TeamMemberDummy, id: randomUUID() };
      UserRepositoryMock.orm.findOneBy.mockResolvedValue(userDummy);
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce({ ...newMember, member_of_teams: [] });
      TeamRepositoryMock.findActiveTeamWithMembers.mockResolvedValue({
        team: { ...TeamWithMembersDummy, payment_type: PaymentType.OFFLINE, team_size: 1, team_size_limit: 10 },
        members: [userDummy],
      });

      await teamManagementService.addTeamMember(
        newMember.id,
        TeamWithMembersDummy.owner_id,
        TeamWithMembersDummy.id,
        firstName,
        lastName,
        expiryDate,
      );

      expect(TeamRepositoryMock.update).toBeCalledWith(TeamWithMembersDummy.id, { team_size: 2 });
      expect(StripeServiceMock.updateSubscription).not.toBeCalled();
    });
  });

  describe('bulkDeleteTeamMembers', () => {
    it('negative: if team does not exist in DB, throw the NotFoundException', async () => {
      const owner_id = randomUUID();
      const member_ids = [randomUUID()];
      TeamRepositoryMock.findActiveTeamWithMembers.mockResolvedValueOnce({ team: null });
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
      TeamRepositoryMock.findActiveTeamWithMembers.mockResolvedValue({
        team: TeamWithMembersDummy,
        members: [userDummy, TeamMemberDummy],
      });
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      TeamToMemberRepositoryMock.orm.find.mockResolvedValueOnce([TeamWithMembersDummy]);

      await teamManagementService.bulkDeleteTeamMembers(
        [TeamMemberDummy.id],
        TeamWithMembersDummy.owner_id,
        TeamWithMembersDummy.id,
      );

      expect(TeamToMemberRepositoryMock.orm.delete).toBeCalledWith({
        team_id: TeamWithMembersDummy.id,
        member_id: TeamMemberDummy.id,
      });
      expect(RevenueCatServiceMock.revokeTeamMembership).toBeCalledWith(TeamMemberDummy.id, Entitlement.team_member);
    });
  });

  describe('inviteTeamMember', () => {
    const email = 'test@gamil.com';

    it('negative: if team payment_type is OFFLINE and capacity is full, error should be thrown', async () => {
      TeamRepositoryMock.findActiveTeamWithMembers.mockResolvedValue({
        team: { ...TeamWithMembersDummy, payment_type: PaymentType.OFFLINE, team_size: 1, team_size_limit: 1 },
      });
      ConfigServiceMock.get.mockReturnValueOnce('test-secret');
      let exception;
      const errorMessage = `Unable to invite more members to team with ID: ${TeamWithMembersDummy.id}, maximum capacity reached!`;

      try {
        await teamManagementService.inviteTeamMember(userDummy.id, {
          email,
          team_id: TeamWithMembersDummy.id,
          first_name: firstName,
          last_name: lastName,
          member_expiry_date: expiryDate,
          is_admin: false,
          is_member: true,
        });
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeInstanceOf(BadRequestException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: jwt should be created with email and owner_id in payload', async () => {
      TeamRepositoryMock.findActiveTeamWithMembers.mockResolvedValue({ team: TeamWithMembersDummy });
      ConfigServiceMock.get.mockReturnValueOnce('test-secret');

      await teamManagementService.inviteTeamMember(userDummy.id, {
        email,
        team_id: TeamWithMembersDummy.id,
        first_name: firstName,
        last_name: lastName,
        member_expiry_date: expiryDate,
        is_admin: false,
        is_member: true,
      });

      expect(JwtServiceMock.asyncSign).toBeCalledWith(
        {
          email,
          admin_id: userDummy.id,
          team_id: TeamWithMembersDummy.id,
          first_name: firstName,
          last_name: lastName,
          member_expiry_date: expiryDate,
          is_admin: false,
          is_member: true,
          team_name: TeamWithMembersDummy.name,
        },
        'test-secret',
      );
    });

    it('positive: email should be sent with invitation link inside', async () => {
      const singedJwt = 'some.test.jwt.string';
      TeamRepositoryMock.findActiveTeamWithMembers.mockResolvedValue({ team: TeamWithMembersDummy });
      JwtServiceMock.asyncSign.mockResolvedValue(singedJwt);

      await teamManagementService.inviteTeamMember(userDummy.id, {
        email,
        team_id: TeamWithMembersDummy.id,
        first_name: firstName,
        last_name: lastName,
        member_expiry_date: expiryDate,
        is_admin: false,
        is_member: true,
      });

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

    it('positive: member invitation should be sent if team payment_type if OFFLINE and team has available capacity', async () => {
      TeamRepositoryMock.findActiveTeamWithMembers.mockResolvedValue({
        team: { ...TeamWithMembersDummy, payment_type: PaymentType.OFFLINE, team_size: 1, team_size_limit: 2 },
      });
      const singedJwt = 'some.test.jwt.string';
      JwtServiceMock.asyncSign.mockResolvedValue(singedJwt);

      await teamManagementService.inviteTeamMember(userDummy.id, {
        email,
        team_id: TeamWithMembersDummy.id,
        first_name: firstName,
        last_name: lastName,
        member_expiry_date: expiryDate,
        is_admin: false,
        is_member: true,
      });

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
    it('negative: throw bad request error if trying to remove owner from the team', async () => {
      TeamRepositoryMock.findActiveTeamWithMembers.mockResolvedValueOnce({ team: TeamWithMembersDummy });

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
      TeamRepositoryMock.findActiveTeamWithMembers.mockResolvedValue({
        team: TeamWithMembersDummy,
        members: [userDummy, TeamMemberDummy],
      });
      TeamToMemberRepositoryMock.orm.find.mockResolvedValueOnce([TeamWithMembersDummy]);

      await teamManagementService.removeMember(userDummy.id, TeamMemberDummy.id, TeamWithMembersDummy.id);

      expect(TeamRepositoryMock.update).toBeCalledWith(TeamWithMembersDummy.id, { team_size: 1 });
    });

    it('positive: stripe subscription should be updated to decrease team size', async () => {
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce({
        ...TeamMemberDummy,
      });
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      TeamRepositoryMock.findActiveTeamWithMembers.mockResolvedValue({
        team: TeamWithMembersDummy,
        members: [userDummy, TeamMemberDummy],
      });
      TeamToMemberRepositoryMock.orm.find.mockResolvedValueOnce([TeamWithMembersDummy]);
      const {
        stripe_data: { subscriptionId, subscriptionItemId },
      } = TeamWithMembersDummy;

      await teamManagementService.removeMember(userDummy.id, TeamMemberDummy.id, TeamWithMembersDummy.id);

      expect(StripeServiceMock.updateSubscription).toBeCalledWith(subscriptionId, subscriptionItemId, 1);
    });

    it('positive: if team payment_type if OFFLINE, team size should be updated in DB, but not in Stripe', async () => {
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce({
        ...TeamMemberDummy,
      });
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      TeamRepositoryMock.findActiveTeamWithMembers.mockResolvedValue({
        team: { ...TeamWithMembersDummy, payment_type: PaymentType.OFFLINE },
        members: [userDummy, TeamMemberDummy],
      });
      TeamToMemberRepositoryMock.orm.find.mockResolvedValueOnce([TeamWithMembersDummy]);

      await teamManagementService.removeMember(userDummy.id, TeamMemberDummy.id, TeamWithMembersDummy.id);

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
    it('positive: should get members and admin of team, get their emails from auth0 and return the users', async () => {
      TeamRepositoryMock.findActiveTeamWithMembers.mockResolvedValueOnce({
        team: TeamWithMembersDummy,
        members: [userDummy, TeamMemberDummy],
        admins: [userDummy],
      });
      TeamToMemberRepositoryMock.orm.findOne
        .mockResolvedValueOnce({
          first_name: firstName,
          last_name: lastName,
          member_expiry_date: expiryDate,
        })
        .mockResolvedValueOnce({
          first_name: firstName,
          last_name: lastName,
          member_expiry_date: expiryDate,
        });
      TeamToAdminRepositoryMock.orm.findOne.mockResolvedValueOnce({
        first_name: firstName,
        last_name: lastName,
      });
      Auth0ManagementServiceMock.getAuth0User.mockResolvedValue({ email: 'test@mail.com' });
      UserRepositoryMock.orm.findOne.mockResolvedValue({
        morning_routines_streak: userDummy.morning_routines_streak,
        evening_routines_streak: userDummy.evening_routines_streak,
        focus_modes_streak: userDummy.focus_modes_streak,
      });

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

  describe('assignNewMemberAsAdmin', () => {
    it('negative, should throw bad request exception if user is already admin member of team', async () => {
      const memberId = TeamMemberDummy.id;
      const teamId = TeamWithMembersDummy.id;
      // mock new member to already be an admin of this team
      TeamRepositoryMock.getTeamAdmins.mockResolvedValueOnce([{ id: userDummy.id }, { id: memberId }]);
      let exception;
      const errorMessage = `User with ID: ${memberId} is already an admin member of team with ID: ${teamId}!`;

      try {
        await teamManagementService.assignNewMemberAsAdmin(memberId, teamId, firstName, lastName);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeInstanceOf(BadRequestException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: should create TeamToAdmin record indicating user is connected to team as admin', async () => {
      const memberId = TeamMemberDummy.id;
      const teamId = TeamWithMembersDummy.id;
      TeamRepositoryMock.getTeamAdmins.mockResolvedValueOnce([{ id: userDummy.id }]);

      await teamManagementService.assignNewMemberAsAdmin(memberId, teamId, firstName, lastName);

      expect(TeamToAdminRepositoryMock.orm.save).toBeCalledWith(
        new TeamToAdmin({
          team_id: teamId,
          admin_id: memberId,
          first_name: firstName,
          last_name: lastName,
        }),
      );
      expect(RevenueCatServiceMock.grantTeamMembership).toBeCalledWith(memberId, Entitlement.team_admin);
    });
  });
});
