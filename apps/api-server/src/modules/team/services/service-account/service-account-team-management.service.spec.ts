import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import {
  DailyStatsDummy,
  TeamMemberDummy,
  TeamMemberFake,
  TeamWithMembersDummy,
  userDummy,
} from '../../../../../test/dummies';
import { TeamRepositoryMock, UserRepositoryMock, UserDailyStatsServiceMock } from '../../../../../test/mocks';
import { UserRepository } from '../../../user/repositories/user.repository';
import { TeamRepository } from '../../repositories/team.repository';
import { UserDailyStatsService } from '../../../user/services/user-daily-stats/user-daily-stats.service';
import { ServiceAccountTeamManagementService } from './service-account-team-management.service';
import { TeamToMember } from '../../entities/team-to-member.entity';
import { TeamToAdmin } from '../../entities/team-to-admin.entity';

describe('ServiceAccountTeamManagementService', () => {
  let service: ServiceAccountTeamManagementService;

  const adminId = randomUUID();

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
      providers: [UserRepository, TeamRepository, UserDailyStatsService, ServiceAccountTeamManagementService],
    })
      .overrideProvider(UserRepository)
      .useValue(UserRepositoryMock)
      .overrideProvider(TeamRepository)
      .useValue(TeamRepositoryMock)
      .overrideProvider(UserDailyStatsService)
      .useValue(UserDailyStatsServiceMock)
      .compile();

    service = moduleRef.get<ServiceAccountTeamManagementService>(ServiceAccountTeamManagementService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAllTeamMemberServiceAcc', () => {
    it('positive: should get team members without admin permission check', async () => {
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

      const response = await service.getAllTeamMemberServiceAcc(TeamWithMembersDummy.id);

      expect(response.admins).toHaveLength(1);
      expect(response.members).toHaveLength(2);
      expect(response.total_count).toBe(2);
      expect(response.team_id).toBe(TeamWithMembersDummy.id);
    });

    it('positive: should handle team with no members', async () => {
      TeamRepositoryMock.orm.findOne.mockResolvedValue(TeamWithMembersDummy);
      TeamRepositoryMock.getTeamIncludingUnregistered.mockResolvedValueOnce({
        members: [],
        admins: [teamToAdminDummy],
      });

      const response = await service.getAllTeamMemberServiceAcc(TeamWithMembersDummy.id);

      expect(response.admins).toHaveLength(1);
      expect(response.members).toHaveLength(0);
      expect(response.total_count).toBe(0);
      expect(response.team_id).toBe(TeamWithMembersDummy.id);
    });

    it('negative: if team does not exist in DB, throw the NotFoundException', async () => {
      TeamRepositoryMock.orm.findOne.mockResolvedValue(null);
      let exception: any;

      try {
        await service.getAllTeamMemberServiceAcc(TeamWithMembersDummy.id);
      } catch (error) {
        exception = error;
      }

      const errorMessage = `Team with id: ${TeamWithMembersDummy.id} doesn't exist!`;
      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: should handle team with only unregistered members', async () => {
      const unregisteredMember = new TeamToMember({
        id: randomUUID(),
        first_name: 'Unregistered',
        last_name: 'User',
        email: 'unregistered@email.com',
        team_id: TeamWithMembersDummy.id,
        member_id: null,
        member_expiry_date: TeamWithMembersDummy.expires_date as Date,
        invitation_status: 'PENDING' as any,
        invitation_sent_at: new Date(),
        invitation_send_count: 1,
        invitation_responded_at: null,
      });

      TeamRepositoryMock.orm.findOne.mockResolvedValue(TeamWithMembersDummy);
      TeamRepositoryMock.getTeamIncludingUnregistered.mockResolvedValueOnce({
        members: [unregisteredMember],
        admins: [teamToAdminDummy],
      });

      const response = await service.getAllTeamMemberServiceAcc(TeamWithMembersDummy.id);

      expect(response.admins).toHaveLength(1);
      expect(response.members).toHaveLength(1);
      expect(response.total_count).toBe(1);
      expect(response.members[0].id).toBe(null);
      expect(response.members[0].email).toBe('unregistered@email.com');
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
        invitation_status: 'PENDING' as any,
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

      UserDailyStatsServiceMock.getLastNDaysDailyStats.mockResolvedValue(DailyStatsDummy);

      const response = await service.getAllTeamMemberServiceAcc(TeamWithMembersDummy.id);

      expect(response.admins).toHaveLength(1);
      expect(response.members).toHaveLength(2);
      expect(response.total_count).toBe(2);

      const registeredMember = response.members.find((m) => m.id === TeamMemberDummy.member_id);
      expect(registeredMember).toBeDefined();
      expect(registeredMember?.morning_routines_streak).toBe(userDummy.morning_routines_streak);

      const unregisteredMemberResponse = response.members.find((m) => m.id === null);
      expect(unregisteredMemberResponse).toBeDefined();
      expect(unregisteredMemberResponse?.email).toBe('unregistered@email.com');
      expect(unregisteredMemberResponse?.morning_routines_streak).toBe(0);
    });

    it('positive: should handle team with only admins and no regular members', async () => {
      TeamRepositoryMock.orm.findOne.mockResolvedValue(TeamWithMembersDummy);
      TeamRepositoryMock.getTeamIncludingUnregistered.mockResolvedValueOnce({
        members: [],
        admins: [teamToAdminDummy, teamToAdminTeamMemberDummy],
      });

      const response = await service.getAllTeamMemberServiceAcc(TeamWithMembersDummy.id);

      expect(response.admins).toHaveLength(2);
      expect(response.members).toHaveLength(0);
      expect(response.total_count).toBe(0);
      expect(response.team_id).toBe(TeamWithMembersDummy.id);
    });

    it('positive: should handle team with members having null member_id (all unregistered)', async () => {
      const unregisteredMember1 = new TeamToMember({
        id: randomUUID(),
        first_name: 'Unregistered1',
        last_name: 'User1',
        email: 'unregistered1@email.com',
        team_id: TeamWithMembersDummy.id,
        member_id: null,
        member_expiry_date: TeamWithMembersDummy.expires_date as Date,
        invitation_status: 'PENDING' as any,
        invitation_sent_at: new Date(),
        invitation_send_count: 1,
        invitation_responded_at: null,
      });

      const unregisteredMember2 = new TeamToMember({
        id: randomUUID(),
        first_name: 'Unregistered2',
        last_name: 'User2',
        email: 'unregistered2@email.com',
        team_id: TeamWithMembersDummy.id,
        member_id: null,
        member_expiry_date: TeamWithMembersDummy.expires_date as Date,
        invitation_status: 'ACCEPTED' as any,
        invitation_sent_at: new Date(),
        invitation_send_count: 2,
        invitation_responded_at: new Date(),
      });

      TeamRepositoryMock.orm.findOne.mockResolvedValue(TeamWithMembersDummy);
      TeamRepositoryMock.getTeamIncludingUnregistered.mockResolvedValueOnce({
        members: [unregisteredMember1, unregisteredMember2],
        admins: [teamToAdminDummy],
      });

      const response = await service.getAllTeamMemberServiceAcc(TeamWithMembersDummy.id);

      expect(response.admins).toHaveLength(1);
      expect(response.members).toHaveLength(2);
      expect(response.total_count).toBe(2);

      expect(response.members[0].id).toBe(null);
      expect(response.members[0].email).toBe('unregistered1@email.com');
      expect(response.members[0].first_name).toBe('Unregistered1');
      expect(response.members[0].last_name).toBe('User1');

      expect(response.members[1].id).toBe(null);
      expect(response.members[1].email).toBe('unregistered2@email.com');
      expect(response.members[1].first_name).toBe('Unregistered2');
      expect(response.members[1].last_name).toBe('User2');
    });

    it('positive: should handle team with members having missing optional fields', async () => {
      const minimalMember = new TeamToMember({
        id: randomUUID(),
        first_name: null as any,
        last_name: null as any,
        email: 'minimal@email.com',
        team_id: TeamWithMembersDummy.id,
        member_id: randomUUID(),
        member_expiry_date: null as any,
        invitation_status: 'ACCEPTED' as any,
        invitation_sent_at: null as any,
        invitation_send_count: 0,
        invitation_responded_at: null as any,
      });

      TeamRepositoryMock.orm.findOne.mockResolvedValue(TeamWithMembersDummy);
      TeamRepositoryMock.getTeamIncludingUnregistered.mockResolvedValueOnce({
        members: [minimalMember],
        admins: [teamToAdminDummy],
      });

      UserRepositoryMock.orm.find.mockResolvedValueOnce([
        {
          morning_routines_streak: 0,
          evening_routines_streak: 0,
          focus_modes_streak: 0,
          id: minimalMember.member_id,
        },
      ]);

      UserDailyStatsServiceMock.getLastNDaysDailyStats.mockResolvedValue([]);

      const response = await service.getAllTeamMemberServiceAcc(TeamWithMembersDummy.id);

      expect(response.admins).toHaveLength(1);
      expect(response.members).toHaveLength(1);
      expect(response.total_count).toBe(1);

      const member = response.members[0];
      expect(member.id).toBe(minimalMember.member_id);
      expect(member.email).toBe('minimal@email.com');
      expect(member.first_name).toBe(null);
      expect(member.last_name).toBe(null);
      expect(member.member_expiry_date).toBe(null);
      expect(member.invitation_sent_at).toBe(null);
      expect(member.invitation_responded_at).toBe(null);
      expect(member.invitation_send_count).toBe(0);
    });

    it('positive: should demonstrate database behavior with null vs undefined member_id', async () => {
      const nullMemberIdMember = new TeamToMember({
        id: randomUUID(),
        first_name: 'Null ID',
        last_name: 'User',
        email: 'nullid@email.com',
        team_id: TeamWithMembersDummy.id,
        member_id: null, // Represents database NULL
        member_expiry_date: TeamWithMembersDummy.expires_date as Date,
        invitation_status: 'PENDING' as any,
        invitation_sent_at: new Date(),
        invitation_send_count: 1,
        invitation_responded_at: null,
      });

      const undefinedMemberIdMember = new TeamToMember({
        id: randomUUID(),
        first_name: 'Undefined ID',
        last_name: 'User',
        email: 'undefinedid@email.com',
        team_id: TeamWithMembersDummy.id,
        member_id: undefined as any, // Demonstrates undefined case
        member_expiry_date: TeamWithMembersDummy.expires_date as Date,
        invitation_status: 'PENDING' as any,
        invitation_sent_at: new Date(),
        invitation_send_count: 1,
        invitation_responded_at: null,
      });

      TeamRepositoryMock.orm.findOne.mockResolvedValue(TeamWithMembersDummy);
      TeamRepositoryMock.getTeamIncludingUnregistered.mockResolvedValueOnce({
        members: [nullMemberIdMember, undefinedMemberIdMember],
        admins: [teamToAdminDummy],
      });

      UserRepositoryMock.orm.find.mockResolvedValueOnce([]);
      UserDailyStatsServiceMock.getLastNDaysDailyStats.mockResolvedValue([]);

      const response = await service.getAllTeamMemberServiceAcc(TeamWithMembersDummy.id);

      expect(response.admins).toHaveLength(1);
      expect(response.members).toHaveLength(2);
      expect(response.total_count).toBe(2);

      expect(response.members[0].id).toBe(null);
      expect(response.members[1].id).toBe(undefined);
    });
  });
});
