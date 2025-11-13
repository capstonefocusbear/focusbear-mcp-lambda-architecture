import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { Auth0ManagementService } from '@app/auth0';
import { UnlockRequestService } from './unlock-request.service';
import { UnlockRequestRepository } from '../repositories/unlock-request.repository';
import { AccountabilityBuddyRepository } from '../repositories/accountability-buddy.repository';
import { UserRepository } from '../../user/repositories/user.repository';
import { AccountabilityTokenService } from './accountability-token.service';
import { AccountabilityEmailService } from './accountability-email.service';
import { AccountabilityNotificationService } from './accountability-notification.service';
import { UnlockRequest } from '../entities/unlock-request.entity';
import { UnlockRequestStatus } from '../domain/unlock-request-status.enum';
import { InvitationStatus } from '../domain/invitation-status.enum';
import { AccountabilityBuddy } from '../entities/accountability-buddy.entity';
import { User } from '../../user/entities/user.entity';
import { CreateUnlockRequestDto } from '../dto/create-unlock-request.dto';
import { UnlockRequestApprovalPayload } from '../domain/unlock-request-approval-payload.model';
import {
  UnlockRequestRepositoryMock,
  AccountabilityBuddyRepositoryMock,
  AccountabilityTokenServiceMock,
  AccountabilityEmailServiceMock,
  AccountabilityNotificationServiceMock,
} from '../../../../test/mocks/accountability-buddy.mocks';
import { UserRepositoryMock, Auth0ManagementServiceMock, SentryServiceMock } from '../../../../test/mocks';
import { userDummy } from '../../../../test/dummies';

describe('UnlockRequestService', () => {
  let service: UnlockRequestService;

  const userId = 'user-id-123';
  const buddyUserId = 'buddy-user-id-456';
  const auth0Id = 'auth0-id-123';
  const buddyAuth0Id = 'auth0-id-456';
  const accountabilityBuddyId = 'accountability-buddy-id-123';
  const unlockRequestId = 'unlock-request-id-123';

  const mockUser: User = {
    ...userDummy,
    id: userId,
    auth0_id: auth0Id,
  } as User;

  const mockBuddyUser: User = {
    ...userDummy,
    id: buddyUserId,
    auth0_id: buddyAuth0Id,
  } as User;

  const mockAuth0User = {
    user_id: auth0Id,
    email: 'user@example.com',
    name: 'Test User',
  };

  const mockBuddyAuth0User = {
    user_id: buddyAuth0Id,
    email: 'buddy@example.com',
    name: 'Buddy User',
  };

  const mockAccountabilityBuddy: AccountabilityBuddy = new AccountabilityBuddy({
    id: accountabilityBuddyId,
    user_id: userId,
    buddy_user_id: buddyUserId,
    invitation_status: InvitationStatus.ACCEPTED,
  });

  const mockUnlockRequest: UnlockRequest = new UnlockRequest({
    id: unlockRequestId,
    user_id: userId,
    accountability_buddy_id: accountabilityBuddyId,
    reason: 'Need to check urgent email',
    status: UnlockRequestStatus.PENDING,
    created_at: new Date().toISOString(),
  });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        UnlockRequestService,
        UnlockRequestRepository,
        AccountabilityBuddyRepository,
        UserRepository,
        Auth0ManagementService,
        AccountabilityTokenService,
        AccountabilityEmailService,
        AccountabilityNotificationService,
        ConfigService,
        I18nService,
        {
          provide: SENTRY_TOKEN,
          useValue: SentryServiceMock,
        },
      ],
    })
      .overrideProvider(UnlockRequestRepository)
      .useValue(UnlockRequestRepositoryMock)
      .overrideProvider(AccountabilityBuddyRepository)
      .useValue(AccountabilityBuddyRepositoryMock)
      .overrideProvider(UserRepository)
      .useValue(UserRepositoryMock)
      .overrideProvider(Auth0ManagementService)
      .useValue(Auth0ManagementServiceMock)
      .overrideProvider(AccountabilityTokenService)
      .useValue(AccountabilityTokenServiceMock)
      .overrideProvider(AccountabilityEmailService)
      .useValue(AccountabilityEmailServiceMock)
      .overrideProvider(AccountabilityNotificationService)
      .useValue(AccountabilityNotificationServiceMock)
      .overrideProvider(ConfigService)
      .useValue({
        get: jest.fn((key: string) => {
          if (key === 'server.frontEndUrl') return 'https://app.example.com';
          if (key === 'server.devFrontendUrl') return 'https://dev.example.com';
          return undefined;
        }),
      })
      .overrideProvider(I18nService)
      .useValue({
        t: jest.fn((key: string) => {
          return key;
        }),
      })
      .compile();

    service = moduleRef.get<UnlockRequestService>(UnlockRequestService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createUnlockRequest', () => {
    const createDto: CreateUnlockRequestDto = {
      accountability_buddy_user_id: buddyUserId,
      reason: 'Need to check urgent email',
    };

    it('should throw NotFoundException when accountability buddy relationship not found', async () => {
      AccountabilityBuddyRepositoryMock.findUserBuddy.mockResolvedValueOnce(null);

      await expect(service.createUnlockRequest(userId, createDto)).rejects.toThrow(NotFoundException);
      await expect(service.createUnlockRequest(userId, createDto)).rejects.toThrow(
        'Accountability buddy relationship not found',
      );
    });

    it('should throw BadRequestException when invitation is not accepted', async () => {
      const pendingBuddy = new AccountabilityBuddy({
        ...mockAccountabilityBuddy,
        invitation_status: InvitationStatus.PENDING,
      });

      AccountabilityBuddyRepositoryMock.findUserBuddy.mockResolvedValue(pendingBuddy);

      await expect(service.createUnlockRequest(userId, createDto)).rejects.toThrow(BadRequestException);
      await expect(service.createUnlockRequest(userId, createDto)).rejects.toThrow(
        'Accountability buddy invitation must be accepted first',
      );
    });

    it('should throw BadRequestException when buddy user ID is missing', async () => {
      const buddyWithoutUserId = new AccountabilityBuddy({
        ...mockAccountabilityBuddy,
        buddy_user_id: undefined,
      });

      AccountabilityBuddyRepositoryMock.findUserBuddy.mockResolvedValue(buddyWithoutUserId);

      await expect(service.createUnlockRequest(userId, createDto)).rejects.toThrow(BadRequestException);
      await expect(service.createUnlockRequest(userId, createDto)).rejects.toThrow('Buddy user ID is missing');
    });

    it('should throw BadRequestException when cooldown period has not passed', async () => {
      const recentRequest = new UnlockRequest({
        ...mockUnlockRequest,
        created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
      });

      AccountabilityBuddyRepositoryMock.findUserBuddy.mockResolvedValue(mockAccountabilityBuddy);
      UnlockRequestRepositoryMock.findMostRecentByUserId.mockResolvedValue(recentRequest);

      await expect(service.createUnlockRequest(userId, createDto)).rejects.toThrow(BadRequestException);
      await expect(service.createUnlockRequest(userId, createDto)).rejects.toThrow('Please wait');
    });

    it('should successfully create an unlock request', async () => {
      const savedRequest = new UnlockRequest({
        ...mockUnlockRequest,
        id: unlockRequestId,
      });

      AccountabilityBuddyRepositoryMock.findUserBuddy.mockResolvedValueOnce(mockAccountabilityBuddy);
      UnlockRequestRepositoryMock.findMostRecentByUserId.mockResolvedValueOnce(null);
      UnlockRequestRepositoryMock.create.mockResolvedValueOnce(savedRequest);
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(mockBuddyUser);
      Auth0ManagementServiceMock.getAuth0User.mockResolvedValueOnce(mockBuddyAuth0User);
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(mockUser);
      Auth0ManagementServiceMock.getAuth0User.mockResolvedValueOnce(mockAuth0User);
      AccountabilityTokenServiceMock.generateApprovalToken.mockResolvedValueOnce('approval-token');
      AccountabilityEmailServiceMock.getFrontendBaseUrl.mockReturnValue('https://app.example.com');
      AccountabilityEmailServiceMock.sendUnlockRequestEmail.mockResolvedValueOnce(undefined);
      AccountabilityNotificationServiceMock.createUnlockRequestNotification.mockResolvedValueOnce({} as any);

      const result = await service.createUnlockRequest(userId, createDto);

      expect(result).toEqual(savedRequest);
      expect(UnlockRequestRepositoryMock.create).toHaveBeenCalled();
      expect(AccountabilityEmailServiceMock.sendUnlockRequestEmail).toHaveBeenCalled();
      expect(AccountabilityNotificationServiceMock.createUnlockRequestNotification).toHaveBeenCalled();
    });
  });

  describe('rejectUnlockRequest', () => {
    const token = 'valid-approval-token';
    const payload: UnlockRequestApprovalPayload = {
      unlock_request_id: unlockRequestId,
      user_id: userId,
      buddy_user_id: buddyUserId,
    };

    it('should throw UnauthorizedException for invalid token', async () => {
      AccountabilityTokenServiceMock.verifyApprovalToken.mockRejectedValue(new Error('Invalid token'));

      await expect(service.rejectUnlockRequest(token, buddyUserId)).rejects.toThrow(UnauthorizedException);
      await expect(service.rejectUnlockRequest(token, buddyUserId)).rejects.toThrow(
        'Invalid or expired approval token',
      );
    });

    it('should throw UnauthorizedException when request is not for the user', async () => {
      AccountabilityTokenServiceMock.verifyApprovalToken.mockResolvedValue(payload);

      await expect(service.rejectUnlockRequest(token, 'different-user-id')).rejects.toThrow(UnauthorizedException);
      await expect(service.rejectUnlockRequest(token, 'different-user-id')).rejects.toThrow(
        'This request is not for your account',
      );
    });

    it('should throw NotFoundException when unlock request not found', async () => {
      AccountabilityTokenServiceMock.verifyApprovalToken.mockResolvedValue(payload);
      UnlockRequestRepositoryMock.findById.mockResolvedValue(null);

      await expect(service.rejectUnlockRequest(token, buddyUserId)).rejects.toThrow(NotFoundException);
      await expect(service.rejectUnlockRequest(token, buddyUserId)).rejects.toThrow('Unlock request not found');
    });

    it('should throw BadRequestException when request is not pending', async () => {
      const approvedRequest = new UnlockRequest({
        ...mockUnlockRequest,
        status: UnlockRequestStatus.APPROVED,
      });

      AccountabilityTokenServiceMock.verifyApprovalToken.mockResolvedValue(payload);
      UnlockRequestRepositoryMock.findById.mockResolvedValue(approvedRequest);

      await expect(service.rejectUnlockRequest(token, buddyUserId)).rejects.toThrow(BadRequestException);
      await expect(service.rejectUnlockRequest(token, buddyUserId)).rejects.toThrow(
        'Unlock request is already approved',
      );
    });

    it('should successfully reject an unlock request', async () => {
      const rejectedRequest = new UnlockRequest({
        ...mockUnlockRequest,
        status: UnlockRequestStatus.REJECTED,
      });

      AccountabilityTokenServiceMock.verifyApprovalToken.mockResolvedValueOnce(payload);
      UnlockRequestRepositoryMock.findById.mockResolvedValueOnce(mockUnlockRequest);
      UnlockRequestRepositoryMock.update.mockResolvedValueOnce(rejectedRequest);
      AccountabilityNotificationServiceMock.createUnlockRequestRejectedNotification.mockResolvedValueOnce({} as any);

      const result = await service.rejectUnlockRequest(token, buddyUserId);

      expect(result).toEqual(rejectedRequest);
      expect(UnlockRequestRepositoryMock.update).toHaveBeenCalled();
      expect(AccountabilityNotificationServiceMock.createUnlockRequestRejectedNotification).toHaveBeenCalled();
    });
  });

  describe('getUnlockRequests', () => {
    it('should return empty array when user has no buddies (asBuddy=true)', async () => {
      AccountabilityBuddyRepositoryMock.findBuddiesByUserId.mockResolvedValueOnce([]);

      const result = await service.getUnlockRequests(userId, true);

      expect(result).toEqual([]);
    });

    it('should return unlock requests for buddies (asBuddy=true)', async () => {
      const buddies = [mockAccountabilityBuddy];
      const requests = [mockUnlockRequest];

      AccountabilityBuddyRepositoryMock.findBuddiesByUserId.mockResolvedValueOnce(buddies);
      UnlockRequestRepositoryMock.findByAccountabilityBuddyIds.mockResolvedValueOnce(requests);

      const result = await service.getUnlockRequests(userId, true);

      expect(result).toEqual(requests);
    });

    it('should return unlock requests for user (asBuddy=false)', async () => {
      const requests = [mockUnlockRequest];

      UnlockRequestRepositoryMock.findByUserId.mockResolvedValueOnce(requests);

      const result = await service.getUnlockRequests(userId, false);

      expect(result).toEqual(requests);
    });
  });

  describe('getApprovedUnlockRequests', () => {
    it('should return approved unlock requests for user', async () => {
      const approvedRequest = new UnlockRequest({
        ...mockUnlockRequest,
        status: UnlockRequestStatus.APPROVED,
      });

      UnlockRequestRepositoryMock.findApprovedByUserId.mockResolvedValueOnce([approvedRequest]);

      const result = await service.getApprovedUnlockRequests(userId);

      expect(result).toEqual([approvedRequest]);
      expect(UnlockRequestRepositoryMock.findApprovedByUserId).toHaveBeenCalledWith(userId);
    });
  });

  describe('approveUnlockRequestById', () => {
    const requestWithBuddy = new UnlockRequest({
      ...mockUnlockRequest,
      accountability_buddy: mockAccountabilityBuddy,
    });

    it('should throw NotFoundException when unlock request not found', async () => {
      UnlockRequestRepositoryMock.findByIdWithRelations.mockResolvedValue(null);

      await expect(service.approveUnlockRequestById(unlockRequestId, buddyUserId)).rejects.toThrow(NotFoundException);
      await expect(service.approveUnlockRequestById(unlockRequestId, buddyUserId)).rejects.toThrow(
        'Unlock request not found',
      );
    });

    it('should throw UnauthorizedException when user is not authorized', async () => {
      UnlockRequestRepositoryMock.findByIdWithRelations.mockResolvedValue(requestWithBuddy);

      await expect(service.approveUnlockRequestById(unlockRequestId, 'different-user-id')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.approveUnlockRequestById(unlockRequestId, 'different-user-id')).rejects.toThrow(
        'You are not authorized to approve this unlock request',
      );
    });

    it('should throw BadRequestException when request is not pending', async () => {
      const approvedRequest = new UnlockRequest({
        ...requestWithBuddy,
        status: UnlockRequestStatus.APPROVED,
      });

      UnlockRequestRepositoryMock.findByIdWithRelations.mockResolvedValue(approvedRequest);

      await expect(service.approveUnlockRequestById(unlockRequestId, buddyUserId)).rejects.toThrow(BadRequestException);
      await expect(service.approveUnlockRequestById(unlockRequestId, buddyUserId)).rejects.toThrow(
        'Unlock request is already approved',
      );
    });

    it('should successfully approve an unlock request', async () => {
      const approvedRequest = new UnlockRequest({
        ...requestWithBuddy,
        status: UnlockRequestStatus.APPROVED,
        approved_at: new Date(),
      });

      UnlockRequestRepositoryMock.findByIdWithRelations.mockResolvedValueOnce(requestWithBuddy);
      UnlockRequestRepositoryMock.update.mockResolvedValueOnce(approvedRequest);
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(mockUser);
      Auth0ManagementServiceMock.getAuth0User.mockResolvedValueOnce(mockAuth0User);
      AccountabilityEmailServiceMock.sendUnlockRequestApprovedEmail.mockResolvedValueOnce(undefined);
      AccountabilityNotificationServiceMock.createUnlockRequestApprovedNotification.mockResolvedValueOnce({} as any);

      const result = await service.approveUnlockRequestById(unlockRequestId, buddyUserId);

      expect(result.status).toBe(UnlockRequestStatus.APPROVED);
      expect(result.approved_at).toBeDefined();
      expect(UnlockRequestRepositoryMock.update).toHaveBeenCalled();
      expect(AccountabilityEmailServiceMock.sendUnlockRequestApprovedEmail).toHaveBeenCalledWith(mockAuth0User.email);
      expect(AccountabilityNotificationServiceMock.createUnlockRequestApprovedNotification).toHaveBeenCalled();
    });
  });

  describe('markUnlockRequestAsUsed', () => {
    it('should throw NotFoundException when unlock request not found', async () => {
      UnlockRequestRepositoryMock.findByIdAndUserId.mockResolvedValue(null);

      await expect(service.markUnlockRequestAsUsed(unlockRequestId, userId)).rejects.toThrow(NotFoundException);
      await expect(service.markUnlockRequestAsUsed(unlockRequestId, userId)).rejects.toThrow(
        'Unlock request not found',
      );
    });

    it('should throw BadRequestException when request is not approved', async () => {
      UnlockRequestRepositoryMock.findByIdAndUserId.mockResolvedValue(mockUnlockRequest);

      await expect(service.markUnlockRequestAsUsed(unlockRequestId, userId)).rejects.toThrow(BadRequestException);
      await expect(service.markUnlockRequestAsUsed(unlockRequestId, userId)).rejects.toThrow(
        'Only approved unlock requests can be marked as used',
      );
    });

    it('should successfully mark an unlock request as used', async () => {
      const approvedRequest = new UnlockRequest({
        ...mockUnlockRequest,
        status: UnlockRequestStatus.APPROVED,
      });

      const usedRequest = new UnlockRequest({
        ...approvedRequest,
        status: UnlockRequestStatus.USED,
      });

      UnlockRequestRepositoryMock.findByIdAndUserId.mockResolvedValueOnce(approvedRequest);
      UnlockRequestRepositoryMock.update.mockResolvedValueOnce(usedRequest);

      const result = await service.markUnlockRequestAsUsed(unlockRequestId, userId);

      expect(result.status).toBe(UnlockRequestStatus.USED);
      expect(UnlockRequestRepositoryMock.update).toHaveBeenCalled();
    });
  });
});
