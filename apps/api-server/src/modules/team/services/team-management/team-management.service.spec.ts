import { RevenueCatService } from '@app/revenue-cat';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import { SendGridService } from '../../../../../../../libs/send-grid/src';
import { JwtService } from '../../../../../../../libs/jwt/src';
import { TeamMemberDummy, TeamWithMembersDummy, auth0UserDummy, userDummy } from '../../../../../test/dummies';
import {
  JwtServiceMock,
  RevenueCatServiceMock,
  SendGridServiceMock,
  SentryServiceMock,
  TeamRepositoryMock,
  UserRepositoryMock,
  Auth0ManagementServiceMock,
} from '../../../../../test/mocks';
import { UserRepository } from '../../../user/repositories/user.repository';
import { TeamRepository } from '../../repositories/team.repository';
import { TeamManagementService } from './team-management.service';
import { Auth0ManagementService } from '../../../../../../../libs/auth0/src';

describe('TeamManagementService', () => {
  let teamManagementService: TeamManagementService;

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
      .compile();

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
        await teamManagementService.addTeamMember(user_id, TeamWithMembersDummy.owner_id);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('negative: if team does not exist in DB, throw the NotFoundException', async () => {
      const owner_id = randomUUID();
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(TeamMemberDummy);
      TeamRepositoryMock.findActiveTeamWithMembersByOwnerId.mockResolvedValueOnce(null);
      const errorMessage = `The Team with owner_id: ${owner_id} does not exist or is inactive!`;
      let exception: any;

      try {
        await teamManagementService.addTeamMember(TeamMemberDummy.id, owner_id);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('negative: if team has no free spots, throw the BadRequestException', async () => {
      const newMember = { ...TeamMemberDummy, id: randomUUID() };
      const teamWithNoFreeSpots = { ...TeamWithMembersDummy, team_size: TeamWithMembersDummy.members.length };
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(newMember);
      TeamRepositoryMock.findActiveTeamWithMembersByOwnerId.mockResolvedValueOnce(teamWithNoFreeSpots);
      let exception: any;

      try {
        await teamManagementService.addTeamMember(newMember.id, teamWithNoFreeSpots.owner_id);
      } catch (error) {
        exception = error;
      }

      const errorMessage = 'The Team has no free spots to add a new member!';
      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(BadRequestException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('negative: if user already participates that team, throw the BadRequestException', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(TeamMemberDummy);
      TeamRepositoryMock.findActiveTeamWithMembersByOwnerId.mockResolvedValueOnce(TeamWithMembersDummy);
      let exception: any;

      try {
        await teamManagementService.addTeamMember(TeamMemberDummy.id, TeamWithMembersDummy.owner_id);
      } catch (error) {
        exception = error;
      }

      const errorMessage = 'The User already participates in this Team!';
      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(BadRequestException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('negative: if user already participates another team, throw the BadRequestException', async () => {
      const newMemberWithAnotherTeam = { ...TeamMemberDummy, id: randomUUID(), member_of_team_id: randomUUID() };
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(newMemberWithAnotherTeam);
      TeamRepositoryMock.findActiveTeamWithMembersByOwnerId.mockResolvedValueOnce(TeamWithMembersDummy);
      let exception: any;

      try {
        await teamManagementService.addTeamMember(newMemberWithAnotherTeam.id, TeamWithMembersDummy.owner_id);
      } catch (error) {
        exception = error;
      }

      const errorMessage = 'The User already participates in another Team!';
      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(BadRequestException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: user with team association should be saved in the DB and the membership entitlement need to be granted via RevenueCat', async () => {
      const newMember = { ...TeamMemberDummy, id: randomUUID(), member_of_team_id: null, member_of_team: null };
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(newMember);
      TeamRepositoryMock.findActiveTeamWithMembersByOwnerId.mockResolvedValueOnce(TeamWithMembersDummy);

      await teamManagementService.addTeamMember(newMember.id, TeamWithMembersDummy.owner_id);

      newMember.member_of_team_id = TeamWithMembersDummy.id;
      expect(UserRepositoryMock.orm.save).toBeCalledWith({ ...newMember, member_of_team_id: TeamWithMembersDummy.id });
      expect(RevenueCatServiceMock.grantTeamMembership).toBeCalledWith(newMember.id);
    });
  });

  describe('bulkDeleteTeamMembers', () => {
    it('negative: if team does not exist in DB, throw the NotFoundException', async () => {
      const owner_id = randomUUID();
      const member_ids = [randomUUID()];
      TeamRepositoryMock.findActiveTeamWithMembersByOwnerId.mockResolvedValueOnce(null);
      let exception: any;

      try {
        await teamManagementService.bulkDeleteTeamMembers(member_ids, owner_id);
      } catch (error) {
        exception = error;
      }

      const errorMessage = `The Team with owner_id: ${owner_id} does not exist or is inactive!`;
      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: user should be disassosiated from the team in the DB and the membership entitlement needs to be revoked via RevenueCat', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(TeamMemberDummy);
      TeamRepositoryMock.findActiveTeamWithMembersByOwnerId.mockResolvedValueOnce(TeamWithMembersDummy);

      await teamManagementService.bulkDeleteTeamMembers([TeamMemberDummy.id], TeamWithMembersDummy.owner_id);

      expect(UserRepositoryMock.orm.save).toBeCalledWith({ ...TeamMemberDummy, member_of_team_id: null });
      expect(RevenueCatServiceMock.revokeTeamMembership).toBeCalledWith(TeamMemberDummy.id);
    });
  });

  describe('disassociateSelf', () => {
    it('positive: user should be disassosiated from the team in the DB and the membership entitlement needs to be revoked via RevenueCat', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(TeamMemberDummy);

      await teamManagementService.disassociateSelf(TeamMemberDummy.id);

      expect(UserRepositoryMock.orm.save).toBeCalledWith({ ...TeamMemberDummy, member_of_team_id: null });
      expect(RevenueCatServiceMock.revokeTeamMembership).toBeCalledWith(TeamMemberDummy.id);
    });
  });

  describe('inviteTeamMember', () => {
    const email = 'test@gamil.com';

    it('negative: if user with invitation email already exist in DB, throw the BadRequest', async () => {
      const user = { ...userDummy, id: randomUUID(), email };
      UserRepositoryMock.orm.findOne.mockResolvedValue(user);
      Auth0ManagementServiceMock.getAuth0UserWithEmail.mockResolvedValueOnce([auth0UserDummy]);
      let exception: any;

      try {
        await teamManagementService.inviteTeamMember(email, userDummy.id);
      } catch (error) {
        exception = error;
      }

      const errorMessage = `The user with email: ${user.email} already exists!`;
      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(BadRequestException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: jwt should be created with email and owner_id in payload', async () => {
      TeamRepositoryMock.findActiveTeamWithMembersByOwnerId.mockResolvedValue(TeamWithMembersDummy);
      Auth0ManagementServiceMock.getAuth0UserWithEmail.mockResolvedValueOnce([]);

      await teamManagementService.inviteTeamMember(email, userDummy.id);

      expect(JwtServiceMock.asyncSign).toBeCalledWith({ email, owner_id: userDummy.id });
    });

    it('positive: email should be sent with invitation link inside', async () => {
      const singedJwt = 'some.test.jwt.string';
      TeamRepositoryMock.findActiveTeamWithMembersByOwnerId.mockResolvedValue(TeamWithMembersDummy);
      JwtServiceMock.asyncSign.mockResolvedValue(singedJwt);
      Auth0ManagementServiceMock.getAuth0UserWithEmail.mockResolvedValueOnce([]);

      await teamManagementService.inviteTeamMember(email, userDummy.id);

      expect(SendGridServiceMock.sendEmail).toBeCalledWith({
        to: email,
        from: 'marketing@focusbear.io',
        text: expect.toInclude(`?token=${singedJwt}`),
        subject: 'You were invited to a join team in Focus Bear.',
      });
    });
  });
});
