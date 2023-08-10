import { Injectable } from '@nestjs/common';
import { RevenueCatService } from '@app/revenue-cat';
import { Team } from '../../../team/entities/team.entity';
import { TeamRepository } from '../../../team/repositories/team.repository';
import { UserRepository } from '../../../user/repositories/user.repository';

@Injectable()
export class WebhookHandlerStrategy {
  constructor(
    private readonly teamRepository: TeamRepository,
    private readonly userRepository: UserRepository,
    private readonly revenueCatService: RevenueCatService,
  ) {}

  async clearUserRevenueCatCache(user_id: string) {
    await this.userRepository.update(user_id, {
      revenue_cat_data: null,
      last_date_revenue_cat_data_synced: null,
      revenue_cat_status: null,
    });
  }

  async INITIAL_PURCHASE(event) {
    const isTeamOwner = this.checkTeamOwnerEntitlement(event);
    await this.clearUserRevenueCatCache(event.app_user_id);
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

  // should be handled // for team_owners and members
  async RENEWAL(event) {
    const isTeamOwner = this.checkTeamOwnerEntitlement(event);
    await this.clearUserRevenueCatCache(event.app_user_id);
    if (!isTeamOwner) return null;
    const owner_id = event.app_user_id;
    const team = await this.teamRepository.orm.findOne({ where: { owner_id }, relations: ['members'] });
    team.is_active = true;
    team.expires_date = new Date(event.expiration_at_ms);
    const membersIds = this.extractMemberIds(team);
    const grantMemberAccess = (id) => this.revenueCatService.grantTeamMembership(id);
    const bulkGrantMembersAccess = Promise.all(membersIds.map(grantMemberAccess));
    const [updatedTeam] = await Promise.all([this.teamRepository.orm.save(team), bulkGrantMembersAccess]);
    return updatedTeam;
  }

  async EXPIRATION(event) {
    try {
      const isTeamOwner = this.checkTeamOwnerEntitlement(event);
      await this.clearUserRevenueCatCache(event.app_user_id);
      if (!isTeamOwner) return null;
      const owner_id = event.app_user_id;
      const team = await this.teamRepository.orm.findOne({ where: { owner_id }, relations: ['members'] });
      team.is_active = false;
      const membersIds = this.extractMemberIds(team);
      const revokeMemberAccess = (id) => this.revenueCatService.revokeTeamMembership(id);
      const bulkRevokeMembersAccess = Promise.all(membersIds.map(revokeMemberAccess));
      const [updatedTeam] = await Promise.all([this.teamRepository.orm.save(team), bulkRevokeMembersAccess]);
      return updatedTeam;
    } catch (error) {
      console.error(error);
    }
  }

  private extractMemberIds(team: Team): string[] {
    const membersIds = team.members.map(({ id }) => id);
    const membersWithoutOwnerIds = membersIds.filter((id) => id !== team.owner_id);
    return membersWithoutOwnerIds;
  }

  TEST() {
    return null;
  }

  // TODO: handle creating teams for subscriptions
  // assigned from the RevenueCat dashboard
  // https://github.com/Focus-Bear/backend/issues/54
  async NON_RENEWING_PURCHASE(event) {
    await this.clearUserRevenueCatCache(event.app_user_id);
    return null;
  }

  async PRODUCT_CHANGE(event) {
    await this.clearUserRevenueCatCache(event.app_user_id);
    return null;
  }

  async CANCELLATION(event) {
    await this.clearUserRevenueCatCache(event.app_user_id);
    return null;
  }

  async UNCANCELLATION(event) {
    await this.clearUserRevenueCatCache(event.app_user_id);
    return null;
  }

  BILLING_ISSUE() {
    return null;
  }

  SUBSCRIPTION_PAUSED() {
    return null;
  }

  TRANSFER() {
    return null;
  }
}
