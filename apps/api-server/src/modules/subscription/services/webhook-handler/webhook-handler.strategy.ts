import { Injectable } from '@nestjs/common';
import { TeamRepository } from '../../../team/repositories/team.repository';
import { UserRepository } from '../../../user/repositories/user.repository';

@Injectable()
export class WebhookHandlerStrategy {
  constructor(private readonly teamRepository: TeamRepository, private readonly userRepository: UserRepository) {}

  async INITIAL_PURCHASE(event) {
    const isTeamOwner = this.checkTeamOwnerEntitlement(event);
    if (!isTeamOwner) return null;
    const team_size = this.extractTeamSize(event);
    const owner_id = event.app_user_id;
    const expires_date = new Date(event.expiration_at_ms);
    const team = await this.teamRepository.upsert({ team_size, owner_id, expires_date }, ['owner_id']);
    const owner_of_team_id = team.id;
    const member_of_team_id = team.id;
    await this.userRepository.update(owner_id, { owner_of_team_id, member_of_team_id });
    return team;
  }

  private checkTeamOwnerEntitlement(event): boolean {
    const isTeamOwnerEntitlement = (e) => e === 'team_owner';
    const teamOwnerEntitlement = event.entitlement_ids.find(isTeamOwnerEntitlement);
    return Boolean(teamOwnerEntitlement);
  }

  private extractTeamSize({ entitlement_ids }): number | null {
    const sizeEntitlements = entitlement_ids.filter((e) => e.startsWith('team_size'));
    if (sizeEntitlements.length < 1) return null;
    const sizes: number[] = sizeEntitlements.map((e) => Number(e.split('_')[2]));
    sizes.sort((a, b) => a - b);
    const maxAllowedSize = sizes[sizes.length - 1];
    return maxAllowedSize;
  }

  // NON_RENEWING_PURCHASE() {} // it is promotional type things, will be used for giving access for team_members

  // should be handled // for team_owners and members
  async RENEWAL(event) {
    const isTeamOwner = this.checkTeamOwnerEntitlement(event);
    if (!isTeamOwner) return null;
    const owner_id = event.app_user_id;
    const team = await this.teamRepository.orm.findOne({ where: { owner_id } });
    team.is_active = true;
    team.expires_date = new Date(event.expiration_at_ms);
    return this.teamRepository.orm.save(team);
  }

  async EXPIRATION(event) {
    const isTeamOwner = this.checkTeamOwnerEntitlement(event);
    if (!isTeamOwner) return null;
    const owner_id = event.app_user_id;
    const team = await this.teamRepository.orm.findOne({ where: { owner_id } });
    team.is_active = false;
    return this.teamRepository.orm.save(team);
  }
}
