import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@app/jwt';
import { BuddyInvitationPayload } from '../domain/buddy-invitation-payload.model';
import { UnlockRequestApprovalPayload } from '../domain/unlock-request-approval-payload.model';

@Injectable()
export class AccountabilityTokenService {
  constructor(private readonly jwtService: JwtService, private readonly configService: ConfigService) {}

  async generateInvitationToken(payload: BuddyInvitationPayload): Promise<string> {
    const secret = this.configService.get<string>('tokens.accountability_buddy_invitation.secret');
    return this.jwtService.asyncSign({ ...payload }, secret);
  }

  async verifyInvitationToken(token: string): Promise<BuddyInvitationPayload> {
    const secret = this.configService.get<string>('tokens.accountability_buddy_invitation.secret');
    return this.jwtService.asyncVerify<BuddyInvitationPayload>(token, secret);
  }

  async generateApprovalToken(payload: UnlockRequestApprovalPayload): Promise<string> {
    const secret = this.configService.get<string>('tokens.unlock_request_approval.secret');
    return this.jwtService.asyncSign({ ...payload }, secret);
  }

  async verifyApprovalToken(token: string): Promise<UnlockRequestApprovalPayload> {
    const secret = this.configService.get<string>('tokens.unlock_request_approval.secret');
    return this.jwtService.asyncVerify<UnlockRequestApprovalPayload>(token, secret);
  }
}
