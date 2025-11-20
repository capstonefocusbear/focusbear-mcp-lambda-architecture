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
import { UnlockRequestRole } from '../domain/unlock-request-role.enum';
import { InvitationStatus } from '../domain/invitation-status.enum';
import { AccountabilityBuddy } from '../entities/accountability-buddy.entity';
import { User } from '../../user/entities/user.entity';
import { CreateUnlockRequestDto } from '../dto/create-unlock-request.dto';
import { GetUnlockRequestsQueryDto } from '../dto/get-unlock-requests-query.dto';
import { UnlockRequestApprovalPayload } from '../domain/unlock-request-approval-payload.model';
import { PaginationDto } from '../../../shared/pagination/index.dto';
import { PageOrder } from '../../../shared/domain/page-order.enum';
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
    const requestWithBuddy = new UnlockRequest({
      ...mockUnlockRequest,
      accountability_buddy: mockAccountabilityBuddy,
    });

    it('should throw NotFoundException when unlock request not found', async () => {
      UnlockRequestRepositoryMock.findByIdWithRelations.mockResolvedValue(null);

      await expect(service.rejectUnlockRequest({ id: unlockRequestId }, buddyUserId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.rejectUnlockRequest({ id: unlockRequestId }, buddyUserId)).rejects.toThrow(
        'Unlock request not found',
      );
    });

    it('should throw UnauthorizedException when user is not authorized', async () => {
      UnlockRequestRepositoryMock.findByIdWithRelations.mockResolvedValue(requestWithBuddy);

      await expect(service.rejectUnlockRequest({ id: unlockRequestId }, 'different-user-id')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.rejectUnlockRequest({ id: unlockRequestId }, 'different-user-id')).rejects.toThrow(
        'You are not authorized to reject this unlock request',
      );
    });

    it('should throw BadRequestException when request is not pending', async () => {
      const approvedRequest = new UnlockRequest({
        ...requestWithBuddy,
        status: UnlockRequestStatus.APPROVED,
      });

      UnlockRequestRepositoryMock.findByIdWithRelations.mockResolvedValue(approvedRequest);

      await expect(service.rejectUnlockRequest({ id: unlockRequestId }, buddyUserId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.rejectUnlockRequest({ id: unlockRequestId }, buddyUserId)).rejects.toThrow(
        'Unlock request is already approved',
      );
    });

    it('should successfully reject an unlock request', async () => {
      const rejectedRequest = new UnlockRequest({
        ...requestWithBuddy,
        status: UnlockRequestStatus.REJECTED,
      });

      UnlockRequestRepositoryMock.findByIdWithRelations.mockResolvedValueOnce(requestWithBuddy);
      UnlockRequestRepositoryMock.update.mockResolvedValueOnce(rejectedRequest);
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(mockUser);
      AccountabilityNotificationServiceMock.createUnlockRequestRejectedNotification.mockResolvedValueOnce({} as any);

      const result = await service.rejectUnlockRequest({ id: unlockRequestId }, buddyUserId);

      expect(result).toEqual(rejectedRequest);
      expect(UnlockRequestRepositoryMock.update).toHaveBeenCalled();
      expect(AccountabilityNotificationServiceMock.createUnlockRequestRejectedNotification).toHaveBeenCalled();
    });
  });

  describe('getUnlockRequests', () => {
    const createQuery = (overrides?: Partial<GetUnlockRequestsQueryDto>): GetUnlockRequestsQueryDto => {
      const query = Object.assign(new GetUnlockRequestsQueryDto(), {
        page: 1,
        take: 10,
        order: PageOrder.DESC,
        ...overrides,
      });
      return query;
    };

    it('should return both sent and received requests', async () => {
      const relationships = [mockAccountabilityBuddy];
      const allRequests = [
        mockUnlockRequest,
        new UnlockRequest({
          ...mockUnlockRequest,
          id: 'received-request-id',
          user_id: buddyUserId,
        }),
      ];

      AccountabilityBuddyRepositoryMock.findByBuddyUserId.mockResolvedValueOnce(relationships);
      UnlockRequestRepositoryMock.findCombinedUnlockRequests.mockResolvedValueOnce([allRequests, 2]);

      const query = createQuery();
      const result = await service.getUnlockRequests(userId, query);

      expect(result).toBeInstanceOf(PaginationDto);
      expect(result.data.length).toBe(2);
      expect(result.meta.itemCount).toBe(2);
      expect(AccountabilityBuddyRepositoryMock.findByBuddyUserId).toHaveBeenCalledWith(
        userId,
        InvitationStatus.ACCEPTED,
      );
      expect(UnlockRequestRepositoryMock.findCombinedUnlockRequests).toHaveBeenCalledWith(
        userId,
        [mockAccountabilityBuddy.id],
        expect.objectContaining({}),
        expect.objectContaining({
          skip: 0,
          take: 10,
          order: PageOrder.DESC,
        }),
      );
    });

    it('should filter by status', async () => {
      const approvedRequest = new UnlockRequest({
        ...mockUnlockRequest,
        status: UnlockRequestStatus.APPROVED,
      });

      AccountabilityBuddyRepositoryMock.findByBuddyUserId.mockResolvedValueOnce([]);
      UnlockRequestRepositoryMock.findCombinedUnlockRequests.mockResolvedValueOnce([[approvedRequest], 1]);

      const query = createQuery({ status: UnlockRequestStatus.APPROVED });
      const result = await service.getUnlockRequests(userId, query);

      expect(result.data[0].status).toBe(UnlockRequestStatus.APPROVED);
      expect(UnlockRequestRepositoryMock.findCombinedUnlockRequests).toHaveBeenCalledWith(
        userId,
        [],
        expect.objectContaining({ status: UnlockRequestStatus.APPROVED }),
        expect.any(Object),
      );
    });

    it('should filter by date range', async () => {
      const requests = [mockUnlockRequest];
      const createdFrom = new Date('2024-01-01').toISOString();
      const createdTo = new Date('2024-12-31').toISOString();

      AccountabilityBuddyRepositoryMock.findByBuddyUserId.mockResolvedValueOnce([]);
      UnlockRequestRepositoryMock.findCombinedUnlockRequests.mockResolvedValueOnce([requests, 1]);

      const query = createQuery({ created_from: createdFrom, created_to: createdTo });
      await service.getUnlockRequests(userId, query);

      expect(UnlockRequestRepositoryMock.findCombinedUnlockRequests).toHaveBeenCalledWith(
        userId,
        [],
        expect.objectContaining({ created_from: createdFrom, created_to: createdTo }),
        expect.any(Object),
      );
    });

    it('should return only sent requests when user has no relationships', async () => {
      const sentRequests = [mockUnlockRequest];

      AccountabilityBuddyRepositoryMock.findByBuddyUserId.mockResolvedValueOnce([]);
      UnlockRequestRepositoryMock.findCombinedUnlockRequests.mockResolvedValueOnce([sentRequests, 1]);

      const query = createQuery();
      const result = await service.getUnlockRequests(userId, query);

      expect(result.data).toEqual(sentRequests);
      expect(result.meta.itemCount).toBe(1);
      expect(UnlockRequestRepositoryMock.findCombinedUnlockRequests).toHaveBeenCalledWith(
        userId,
        [],
        expect.any(Object),
        expect.any(Object),
      );
    });

    it('should apply pagination', async () => {
      const relationships = [mockAccountabilityBuddy];
      const paginatedRequests = [mockUnlockRequest];

      AccountabilityBuddyRepositoryMock.findByBuddyUserId.mockResolvedValueOnce(relationships);
      UnlockRequestRepositoryMock.findCombinedUnlockRequests.mockResolvedValueOnce([paginatedRequests, 10]);

      const query = createQuery({ page: 2, take: 5 });
      const result = await service.getUnlockRequests(userId, query);

      expect(result.meta.page).toBe(2);
      expect(result.meta.take).toBe(5);
      // Pagination is now applied at database level
      expect(UnlockRequestRepositoryMock.findCombinedUnlockRequests).toHaveBeenCalledWith(
        userId,
        [mockAccountabilityBuddy.id],
        expect.any(Object),
        expect.objectContaining({
          skip: 5, // (page 2 - 1) * take 5
          take: 5,
          order: PageOrder.DESC,
        }),
      );
    });

    it('should combine and deduplicate when fetching both sent and received', async () => {
      const allRequests = [
        mockUnlockRequest,
        new UnlockRequest({
          ...mockUnlockRequest,
          id: 'different-id',
        }),
      ];
      const relationships = [mockAccountabilityBuddy];

      AccountabilityBuddyRepositoryMock.findByBuddyUserId.mockResolvedValueOnce(relationships);
      UnlockRequestRepositoryMock.findCombinedUnlockRequests.mockResolvedValueOnce([allRequests, 2]);

      const query = createQuery();
      const result = await service.getUnlockRequests(userId, query);

      expect(result.data.length).toBe(2);
      expect(result.meta.itemCount).toBe(2);
    });

    it('should filter by role=SENT to return only sent requests', async () => {
      const sentRequest = mockUnlockRequest;

      AccountabilityBuddyRepositoryMock.findByBuddyUserId.mockResolvedValueOnce([]);
      UnlockRequestRepositoryMock.findCombinedUnlockRequests.mockResolvedValueOnce([[sentRequest], 1]);

      const query = createQuery({ role: UnlockRequestRole.SENT });
      const result = await service.getUnlockRequests(userId, query);

      expect(result.data.length).toBe(1);
      expect(result.data[0].user_id).toBe(userId);
      expect(UnlockRequestRepositoryMock.findCombinedUnlockRequests).toHaveBeenCalledWith(
        userId,
        [],
        expect.objectContaining({ role: UnlockRequestRole.SENT }),
        expect.any(Object),
      );
    });

    it('should filter by role=RECEIVED to return only received requests', async () => {
      const relationships = [mockAccountabilityBuddy];
      const receivedRequest = new UnlockRequest({
        ...mockUnlockRequest,
        id: 'received-request-id',
        user_id: buddyUserId, // Request sent by buddy
        accountability_buddy_id: accountabilityBuddyId, // User is the accountability buddy
      });

      AccountabilityBuddyRepositoryMock.findByBuddyUserId.mockResolvedValueOnce(relationships);
      UnlockRequestRepositoryMock.findCombinedUnlockRequests.mockResolvedValueOnce([[receivedRequest], 1]);

      const query = createQuery({ role: UnlockRequestRole.RECEIVED });
      const result = await service.getUnlockRequests(userId, query);

      expect(result.data.length).toBe(1);
      expect(result.data[0].user_id).toBe(buddyUserId); // Should be from buddy
      expect(result.data[0].accountability_buddy_id).toBe(accountabilityBuddyId);
      expect(UnlockRequestRepositoryMock.findCombinedUnlockRequests).toHaveBeenCalledWith(
        userId,
        [mockAccountabilityBuddy.id],
        expect.objectContaining({ role: UnlockRequestRole.RECEIVED }),
        expect.any(Object),
      );
    });

    it('should return empty list when role=RECEIVED and user has no relationships', async () => {
      AccountabilityBuddyRepositoryMock.findByBuddyUserId.mockResolvedValueOnce([]);
      UnlockRequestRepositoryMock.findCombinedUnlockRequests.mockResolvedValueOnce([[], 0]);

      const query = createQuery({ role: UnlockRequestRole.RECEIVED });
      const result = await service.getUnlockRequests(userId, query);

      expect(result.data.length).toBe(0);
      expect(result.meta.itemCount).toBe(0);
      expect(UnlockRequestRepositoryMock.findCombinedUnlockRequests).toHaveBeenCalledWith(
        userId,
        [],
        expect.objectContaining({ role: UnlockRequestRole.RECEIVED }),
        expect.any(Object),
      );
    });

    it('should return both sent and received when role is not provided', async () => {
      const relationships = [mockAccountabilityBuddy];
      const allRequests = [
        mockUnlockRequest, // Sent request
        new UnlockRequest({
          ...mockUnlockRequest,
          id: 'received-request-id',
          user_id: buddyUserId, // Received request
        }),
      ];

      AccountabilityBuddyRepositoryMock.findByBuddyUserId.mockResolvedValueOnce(relationships);
      UnlockRequestRepositoryMock.findCombinedUnlockRequests.mockResolvedValueOnce([allRequests, 2]);

      const query = createQuery(); // No role parameter
      const result = await service.getUnlockRequests(userId, query);

      expect(result.data.length).toBe(2);
      expect(UnlockRequestRepositoryMock.findCombinedUnlockRequests).toHaveBeenCalledWith(
        userId,
        [mockAccountabilityBuddy.id],
        expect.objectContaining({ role: undefined }),
        expect.any(Object),
      );
    });

    it('should combine role filter with status filter', async () => {
      const relationships = [mockAccountabilityBuddy];
      const approvedReceivedRequest = new UnlockRequest({
        ...mockUnlockRequest,
        id: 'approved-received-id',
        user_id: buddyUserId,
        status: UnlockRequestStatus.APPROVED,
      });

      AccountabilityBuddyRepositoryMock.findByBuddyUserId.mockResolvedValueOnce(relationships);
      UnlockRequestRepositoryMock.findCombinedUnlockRequests.mockResolvedValueOnce([[approvedReceivedRequest], 1]);

      const query = createQuery({
        role: UnlockRequestRole.RECEIVED,
        status: UnlockRequestStatus.APPROVED,
      });
      const result = await service.getUnlockRequests(userId, query);

      expect(result.data.length).toBe(1);
      expect(result.data[0].status).toBe(UnlockRequestStatus.APPROVED);
      expect(result.data[0].user_id).toBe(buddyUserId);
      expect(UnlockRequestRepositoryMock.findCombinedUnlockRequests).toHaveBeenCalledWith(
        userId,
        [mockAccountabilityBuddy.id],
        expect.objectContaining({
          role: UnlockRequestRole.RECEIVED,
          status: UnlockRequestStatus.APPROVED,
        }),
        expect.any(Object),
      );
    });
  });

  describe('approveUnlockRequest', () => {
    const requestWithBuddy = new UnlockRequest({
      ...mockUnlockRequest,
      accountability_buddy: mockAccountabilityBuddy,
    });

    it('should throw NotFoundException when unlock request not found', async () => {
      UnlockRequestRepositoryMock.findByIdWithRelations.mockResolvedValue(null);

      await expect(service.approveUnlockRequest({ id: unlockRequestId }, buddyUserId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.approveUnlockRequest({ id: unlockRequestId }, buddyUserId)).rejects.toThrow(
        'Unlock request not found',
      );
    });

    it('should throw UnauthorizedException when user is not authorized', async () => {
      UnlockRequestRepositoryMock.findByIdWithRelations.mockResolvedValue(requestWithBuddy);

      await expect(service.approveUnlockRequest({ id: unlockRequestId }, 'different-user-id')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.approveUnlockRequest({ id: unlockRequestId }, 'different-user-id')).rejects.toThrow(
        'You are not authorized to approve this unlock request',
      );
    });

    it('should throw BadRequestException when request is not pending', async () => {
      const approvedRequest = new UnlockRequest({
        ...requestWithBuddy,
        status: UnlockRequestStatus.APPROVED,
      });

      UnlockRequestRepositoryMock.findByIdWithRelations.mockResolvedValue(approvedRequest);

      await expect(service.approveUnlockRequest({ id: unlockRequestId }, buddyUserId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.approveUnlockRequest({ id: unlockRequestId }, buddyUserId)).rejects.toThrow(
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

      const result = await service.approveUnlockRequest({ id: unlockRequestId }, buddyUserId);

      expect(result.status).toBe(UnlockRequestStatus.APPROVED);
      expect(result.approved_at).toBeDefined();
      expect(UnlockRequestRepositoryMock.update).toHaveBeenCalled();
      expect(AccountabilityEmailServiceMock.sendUnlockRequestApprovedEmail).toHaveBeenCalledWith(mockAuth0User.email);
      expect(AccountabilityNotificationServiceMock.createUnlockRequestApprovedNotification).toHaveBeenCalled();
    });
  });

  describe('approveUnlockRequestByToken', () => {
    const token = 'valid-approval-token';
    const payload: UnlockRequestApprovalPayload = {
      unlock_request_id: unlockRequestId,
      user_id: userId,
      buddy_user_id: buddyUserId,
    };
    const requestWithBuddy = new UnlockRequest({
      ...mockUnlockRequest,
      accountability_buddy: mockAccountabilityBuddy,
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      AccountabilityTokenServiceMock.verifyApprovalToken.mockRejectedValue(new Error('Invalid token'));

      await expect(service.approveUnlockRequestByToken({ token })).rejects.toThrow(UnauthorizedException);
      await expect(service.approveUnlockRequestByToken({ token })).rejects.toThrow('Invalid or expired approval token');
    });

    it('should throw NotFoundException when unlock request not found', async () => {
      AccountabilityTokenServiceMock.verifyApprovalToken.mockResolvedValue(payload);
      UnlockRequestRepositoryMock.findByIdWithRelations.mockResolvedValue(null);

      await expect(service.approveUnlockRequestByToken({ token })).rejects.toThrow(NotFoundException);
      await expect(service.approveUnlockRequestByToken({ token })).rejects.toThrow('Unlock request not found');
    });

    it('should throw UnauthorizedException when buddy_user_id does not match', async () => {
      const wrongPayload: UnlockRequestApprovalPayload = {
        unlock_request_id: unlockRequestId,
        user_id: userId,
        buddy_user_id: 'different-buddy-id',
      };

      AccountabilityTokenServiceMock.verifyApprovalToken.mockResolvedValue(wrongPayload);
      UnlockRequestRepositoryMock.findByIdWithRelations.mockResolvedValue(requestWithBuddy);

      await expect(service.approveUnlockRequestByToken({ token })).rejects.toThrow(UnauthorizedException);
      await expect(service.approveUnlockRequestByToken({ token })).rejects.toThrow(
        'You are not authorized to approve this unlock request',
      );
    });

    it('should throw BadRequestException when request is not pending', async () => {
      const approvedRequest = new UnlockRequest({
        ...requestWithBuddy,
        status: UnlockRequestStatus.APPROVED,
      });

      AccountabilityTokenServiceMock.verifyApprovalToken.mockResolvedValue(payload);
      UnlockRequestRepositoryMock.findByIdWithRelations.mockResolvedValue(approvedRequest);

      await expect(service.approveUnlockRequestByToken({ token })).rejects.toThrow(BadRequestException);
      await expect(service.approveUnlockRequestByToken({ token })).rejects.toThrow(
        'Unlock request is already approved',
      );
    });

    it('should successfully approve an unlock request by token', async () => {
      const approvedRequest = new UnlockRequest({
        ...requestWithBuddy,
        status: UnlockRequestStatus.APPROVED,
        approved_at: new Date(),
      });

      AccountabilityTokenServiceMock.verifyApprovalToken.mockResolvedValueOnce(payload);
      UnlockRequestRepositoryMock.findByIdWithRelations.mockResolvedValueOnce(requestWithBuddy);
      UnlockRequestRepositoryMock.update.mockResolvedValueOnce(approvedRequest);
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(mockUser);
      Auth0ManagementServiceMock.getAuth0User.mockResolvedValueOnce(mockAuth0User);
      AccountabilityEmailServiceMock.sendUnlockRequestApprovedEmail.mockResolvedValueOnce(undefined);
      AccountabilityNotificationServiceMock.createUnlockRequestApprovedNotification.mockResolvedValueOnce({} as any);

      const result = await service.approveUnlockRequestByToken({ token });

      expect(result.status).toBe(UnlockRequestStatus.APPROVED);
      expect(result.approved_at).toBeDefined();
      expect(UnlockRequestRepositoryMock.update).toHaveBeenCalled();
      expect(AccountabilityEmailServiceMock.sendUnlockRequestApprovedEmail).toHaveBeenCalledWith(mockAuth0User.email);
      expect(AccountabilityNotificationServiceMock.createUnlockRequestApprovedNotification).toHaveBeenCalled();
    });
  });
});
