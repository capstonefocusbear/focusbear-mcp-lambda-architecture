import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@app/jwt';
import { AccountabilityTokenService } from './accountability-token.service';
import { BuddyInvitationPayload } from '../domain/buddy-invitation-payload.model';
import { UnlockRequestApprovalPayload } from '../domain/unlock-request-approval-payload.model';
import { JwtServiceMock } from '../../../../test/mocks';

describe('AccountabilityTokenService', () => {
  let service: AccountabilityTokenService;

  const invitationSecret = 'invitation-secret';
  const approvalSecret = 'approval-secret';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [AccountabilityTokenService, JwtService, ConfigService],
    })
      .overrideProvider(JwtService)
      .useValue(JwtServiceMock)
      .overrideProvider(ConfigService)
      .useValue({
        get: jest.fn((key: string) => {
          if (key === 'tokens.accountability_buddy_invitation.secret') return invitationSecret;
          if (key === 'tokens.unlock_request_approval.secret') return approvalSecret;
          return undefined;
        }),
      })
      .compile();

    service = moduleRef.get<AccountabilityTokenService>(AccountabilityTokenService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateInvitationToken', () => {
    it('should generate an invitation token', async () => {
      const payload: BuddyInvitationPayload = {
        user_id: 'user-id-123',
        buddy_email: 'buddy@example.com',
        accountability_buddy_id: 'buddy-id-123',
      };

      const expectedToken = 'generated-invitation-token';
      JwtServiceMock.asyncSign.mockResolvedValueOnce(expectedToken);

      const result = await service.generateInvitationToken(payload);

      expect(result).toBe(expectedToken);
      expect(JwtServiceMock.asyncSign).toHaveBeenCalledWith({ ...payload }, invitationSecret);
    });
  });

  describe('verifyInvitationToken', () => {
    it('should verify and return invitation token payload', async () => {
      const token = 'valid-invitation-token';
      const expectedPayload: BuddyInvitationPayload = {
        user_id: 'user-id-123',
        buddy_email: 'buddy@example.com',
        accountability_buddy_id: 'buddy-id-123',
      };

      JwtServiceMock.asyncVerify.mockResolvedValueOnce(expectedPayload);

      const result = await service.verifyInvitationToken(token);

      expect(result).toEqual(expectedPayload);
      expect(JwtServiceMock.asyncVerify).toHaveBeenCalledWith(token, invitationSecret);
    });

    it('should throw error when token is invalid', async () => {
      const token = 'invalid-token';
      const error = new Error('Invalid token');

      JwtServiceMock.asyncVerify.mockRejectedValueOnce(error);

      await expect(service.verifyInvitationToken(token)).rejects.toThrow(error);
    });
  });

  describe('generateApprovalToken', () => {
    it('should generate an approval token', async () => {
      const payload: UnlockRequestApprovalPayload = {
        unlock_request_id: 'request-id-123',
        user_id: 'user-id-123',
        buddy_user_id: 'buddy-user-id-456',
      };

      const expectedToken = 'generated-approval-token';
      JwtServiceMock.asyncSign.mockResolvedValueOnce(expectedToken);

      const result = await service.generateApprovalToken(payload);

      expect(result).toBe(expectedToken);
      expect(JwtServiceMock.asyncSign).toHaveBeenCalledWith({ ...payload }, approvalSecret);
    });
  });

  describe('verifyApprovalToken', () => {
    it('should verify and return approval token payload', async () => {
      const token = 'valid-approval-token';
      const expectedPayload: UnlockRequestApprovalPayload = {
        unlock_request_id: 'request-id-123',
        user_id: 'user-id-123',
        buddy_user_id: 'buddy-user-id-456',
      };

      JwtServiceMock.asyncVerify.mockResolvedValueOnce(expectedPayload);

      const result = await service.verifyApprovalToken(token);

      expect(result).toEqual(expectedPayload);
      expect(JwtServiceMock.asyncVerify).toHaveBeenCalledWith(token, approvalSecret);
    });

    it('should throw error when token is invalid', async () => {
      const token = 'invalid-token';
      const error = new Error('Invalid token');

      JwtServiceMock.asyncVerify.mockRejectedValueOnce(error);

      await expect(service.verifyApprovalToken(token)).rejects.toThrow(error);
    });
  });
});
