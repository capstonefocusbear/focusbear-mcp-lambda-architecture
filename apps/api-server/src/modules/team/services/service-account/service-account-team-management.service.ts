import { Injectable, NotFoundException } from '@nestjs/common';
import { In } from 'typeorm';
import { TeamRepository } from '../../repositories/team.repository';
import { UserRepository } from '../../../user/repositories/user.repository';
import { UserDailyStatsService } from '../../../user/services/user-daily-stats/user-daily-stats.service';
import { TeamToMember } from '../../entities/team-to-member.entity';
import { GetAllTeamMembersResponseDto } from '../../dto/get-all-team-members.dto';
import { GetTeamMembersDetailsDto } from '../../dto/team-member-details.dto';
import { DAYS_IN_MONTH, DECIMAL_PRECISION } from '../../../../shared/utils/constants';

@Injectable()
export class ServiceAccountTeamManagementService {
  constructor(
    private readonly teamRepository: TeamRepository,
    private readonly userRepository: UserRepository,
    private readonly userDailyStatsService: UserDailyStatsService,
  ) {}

  private async validateTeam(team_id: string) {
    const team = await this.teamRepository.orm.findOne({ where: { id: team_id } });
    if (!team) {
      throw new NotFoundException(`Team with id: ${team_id} doesn't exist!`);
    }
    return team;
  }

  private async getUserDetails(members: TeamToMember[], memberIds: string[]): Promise<GetTeamMembersDetailsDto[]> {
    const [userDetails, allMembersDailyStats] = await Promise.all([
      this.userRepository.orm.find({
        where: { id: In(memberIds) },
      }),
      Promise.all(memberIds.map((id) => this.userDailyStatsService.getLastNDaysDailyStats(id, DAYS_IN_MONTH * 3))),
    ]);

    return members.map((member, index) => {
      const userDetail = member.member_id ? userDetails.find((u) => u.id === member.member_id) : undefined;
      const last90DaysDailyStats = allMembersDailyStats?.[index];

      const totalFocusModes = last90DaysDailyStats?.reduce((acc, curr) => acc + curr.focus_modes, 0) || 0;
      const focus_modes_percent_number_day_of_stats_completed = totalFocusModes
        ? parseFloat(((totalFocusModes / last90DaysDailyStats.length) * 100).toFixed(DECIMAL_PRECISION))
        : 0;

      const totalFocusModesHours =
        parseFloat(
          last90DaysDailyStats
            ?.reduce((acc, curr) => acc + curr.total_hours_spent_in_focus_sessions, 0)
            .toFixed(DECIMAL_PRECISION),
        ) || 0;

      return {
        id: member.member_id,
        email: member.email,
        last_active_date: userDetail?.updated_at,
        first_name: member?.first_name,
        last_name: member?.last_name,
        member_expiry_date: member?.member_expiry_date,
        created_at: member?.created_at,
        morning_routines_streak: userDetail?.morning_routines_streak || 0,
        evening_routines_streak: userDetail?.evening_routines_streak || 0,
        focus_modes_streak: userDetail?.focus_modes_streak || 0,
        morning_percent_number_day_of_stats_completed: userDetail?.morning_percent_number_day_of_stats_completed || 0,
        micro_percent_number_day_of_stats_completed: userDetail?.micro_percent_number_day_of_stats_completed || 0,
        evening_percent_number_day_of_stats_completed: userDetail?.evening_percent_number_day_of_stats_completed || 0,
        focus_modes_percent_number_day_of_stats_completed,
        total_hours_in_focus_sessions: totalFocusModesHours,
        // New leaderboard day-count fields
        morning_number_days_completed: userDetail?.morning_number_days_completed || 0,
        morning_num_days_of_stats: userDetail?.morning_num_days_of_stats || 0,
        evening_number_days_completed: userDetail?.evening_number_days_completed || 0,
        evening_num_days_of_stats: userDetail?.evening_num_days_of_stats || 0,
        micro_breaks_number_days_completed: userDetail?.micro_breaks_number_days_completed || 0,
        micro_breaks_num_days_of_stats: userDetail?.micro_breaks_num_days_of_stats || 0,
        focus_modes_number_days_completed: userDetail?.focus_modes_number_days_completed || 0,
        focus_modes_num_days_of_stats: userDetail?.focus_modes_num_days_of_stats || 0,
        num_days_of_stats: userDetail?.num_days_of_stats || 0,
        number_days_completed: userDetail?.number_days_completed || 0,
        invitation_status: member.invitation_status,
        invitation_sent_at: member.invitation_sent_at,
        invitation_send_count: member.invitation_send_count,
        invitation_responded_at: member.invitation_responded_at,
      };
    });
  }

  async getAllTeamMemberServiceAcc(teamId: string): Promise<GetAllTeamMembersResponseDto> {
    const team = await this.validateTeam(teamId);
    const { members, admins } = await this.teamRepository.getTeamIncludingUnregistered(team);
    const registeredMembersIds = members.map((member) => member.member_id).filter(Boolean);
    const userDetails = await this.getUserDetails(members, registeredMembersIds as string[]);
    return {
      members: userDetails,
      admins: admins.map((admin) => admin.admin_id),
      total_count: userDetails.length,
      team_id: teamId,
    };
  }
}
