import { RevenueCatService } from '@app/revenue-cat';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { TeamMemberDummy, TeamWithMembersDummy } from '../../../../../test/dummies ';
import { RevenueCatServiceMock, TeamRepositoryMock, UserRepositoryMock } from '../../../../../test/mocks';
import { UserRepository } from '../../../user/repositories/user.repository';
import { TeamRepository } from '../../repositories/team.repository';
import { TeamManagementService } from './team-management.service';

describe('TeamManagementService', () => {
  let teamManagementService: TeamManagementService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [UserRepository, TeamRepository, TeamManagementService, RevenueCatService],
    })
      .overrideProvider(UserRepository)
      .useValue(UserRepositoryMock)
      .overrideProvider(TeamRepository)
      .useValue(TeamRepositoryMock)
      .overrideProvider(RevenueCatService)
      .useValue(RevenueCatServiceMock)
      .compile();

    teamManagementService = moduleRef.get<TeamManagementService>(TeamManagementService);
  });

  it('should be defined', () => {
    expect(teamManagementService).toBeDefined();
  });

  describe('addTeamMember', () => {
    it('negative: if user does not exist in DB, throw the NotFoundException', async () => {
      const user_id = randomUUID();
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(null);
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
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(TeamMemberDummy);
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
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(newMember);
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
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(TeamMemberDummy);
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
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(newMemberWithAnotherTeam);
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

    it('positive: user with team assosiation should be saved in the DB and the membershipe entitlement need to be granted via RevenueCat', async () => {
      const newMember = { ...TeamMemberDummy, id: randomUUID(), member_of_team_id: null, member_of_team: null };
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(newMember);
      TeamRepositoryMock.findActiveTeamWithMembersByOwnerId.mockResolvedValueOnce(TeamWithMembersDummy);

      await teamManagementService.addTeamMember(newMember.id, TeamWithMembersDummy.owner_id);

      newMember.member_of_team_id = TeamWithMembersDummy.id;
      expect(UserRepositoryMock.orm.save).toBeCalledWith({ ...newMember, member_of_team_id: TeamWithMembersDummy.id });
      expect(RevenueCatServiceMock.grantTeamMembershipe).toBeCalledWith(newMember.id);
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

    it('positive: user should be disassosiated from the team in the DB and the membershipe entitlement needs to be revoked via RevenueCat', async () => {
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(TeamMemberDummy);
      TeamRepositoryMock.findActiveTeamWithMembersByOwnerId.mockResolvedValueOnce(TeamWithMembersDummy);

      await teamManagementService.bulkDeleteTeamMembers([TeamMemberDummy.id], TeamWithMembersDummy.owner_id);

      expect(UserRepositoryMock.orm.save).toBeCalledWith({ ...TeamMemberDummy, member_of_team_id: null });
      expect(RevenueCatServiceMock.revokeTeamMembershipe).toBeCalledWith(TeamMemberDummy.id);
    });
  });

  describe('disassociateSelf', () => {
    it('positive: user should be disassosiated from the team in the DB and the membershipe entitlement needs to be revoked via RevenueCat', async () => {
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(TeamMemberDummy);

      await teamManagementService.disassociateSelf(TeamMemberDummy.id);

      expect(UserRepositoryMock.orm.save).toBeCalledWith({ ...TeamMemberDummy, member_of_team_id: null });
      expect(RevenueCatServiceMock.revokeTeamMembershipe).toBeCalledWith(TeamMemberDummy.id);
    });
  });
});
