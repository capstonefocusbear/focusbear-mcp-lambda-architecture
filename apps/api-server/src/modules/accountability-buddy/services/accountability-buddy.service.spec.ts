import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { Auth0ManagementService } from '@app/auth0';
import { AccountabilityBuddyService } from './accountability-buddy.service';
import { AccountabilityBuddyRepository } from '../repositories/accountability-buddy.repository';
import { UserRepository } from '../../user/repositories/user.repository';
import { AccountabilityTokenService } from './accountability-token.service';
import { AccountabilityEmailService } from './accountability-email.service';
import { AccountabilityNotificationService } from './accountability-notification.service';
import { AccountabilityBuddy } from '../entities/accountability-buddy.entity';
import { InvitationStatus } from '../domain/invitation-status.enum';
import { User } from '../../user/entities/user.entity';
import { BuddyInvitationPayload } from '../domain/buddy-invitation-payload.model';
import {
  AccountabilityBuddyRepositoryMock,
  AccountabilityTokenServiceMock,
  AccountabilityEmailServiceMock,
  AccountabilityNotificationServiceMock,
} from '../../../../test/mocks/accountability-buddy.mocks';
import { UserRepositoryMock, Auth0ManagementServiceMock, SentryServiceMock } from '../../../../test/mocks';
import { userDummy } from '../../../../test/dummies';

describe('AccountabilityBuddyService', () => {
  let service: AccountabilityBuddyService;

  const userId = 'user-id-123';
  const buddyUserId = 'buddy-user-id-456';
  const buddyEmail = 'buddy@example.com';
  const auth0Id = 'auth0-id-123';
  const buddyAuth0Id = 'auth0-id-456';
  const accountabilityBuddyId = 'accountability-buddy-id-123';

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
    email: buddyEmail,
    name: 'Buddy User',
  };

  const mockAccountabilityBuddy: AccountabilityBuddy = new AccountabilityBuddy({
    id: accountabilityBuddyId,
    user_id: userId,
    buddy_email: buddyEmail,
    buddy_user_id: buddyUserId,
    invitation_status: InvitationStatus.PENDING,
    invitation_sent_at: new Date(),
  });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AccountabilityBuddyService,
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

    service = moduleRef.get<AccountabilityBuddyService>(AccountabilityBuddyService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('inviteBuddy', () => {
    it('should throw BadRequestException for invalid email format', async () => {
      const invalidEmail = 'invalid-email';

      await expect(service.inviteBuddy(userId, invalidEmail)).rejects.toThrow(BadRequestException);
      await expect(service.inviteBuddy(userId, invalidEmail)).rejects.toThrow('Invalid email format');
    });

    it('should throw BadRequestException when user invites themselves', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValue(mockUser);
      Auth0ManagementServiceMock.getAuth0User.mockResolvedValue({
        ...mockAuth0User,
        email: buddyEmail,
      });

      await expect(service.inviteBuddy(userId, buddyEmail)).rejects.toThrow(BadRequestException);
      await expect(service.inviteBuddy(userId, buddyEmail)).rejects.toThrow(
        'You cannot invite yourself as an accountability buddy',
      );
    });

    it('should throw BadRequestException when user has reached max buddies limit', async () => {
      const maxBuddies = Array(10)
        .fill(null)
        .map(() => new AccountabilityBuddy({}));
      UserRepositoryMock.orm.findOneBy.mockResolvedValue(mockUser);
      Auth0ManagementServiceMock.getAuth0User.mockResolvedValue(mockAuth0User);
      Auth0ManagementServiceMock.getAuth0UsersWithEmail.mockResolvedValue([mockBuddyAuth0User]);
      AccountabilityBuddyRepositoryMock.findBuddiesByUserId.mockResolvedValue(maxBuddies);

      await expect(service.inviteBuddy(userId, buddyEmail)).rejects.toThrow(BadRequestException);
      await expect(service.inviteBuddy(userId, buddyEmail)).rejects.toThrow(
        'Maximum 10 accountability buddies allowed per user',
      );
    });

    it('should throw BadRequestException when invitation is already pending', async () => {
      const existingBuddy = new AccountabilityBuddy({
        ...mockAccountabilityBuddy,
        invitation_status: InvitationStatus.PENDING,
        invitation_sent_at: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago (not expired)
      });

      UserRepositoryMock.orm.findOneBy.mockResolvedValue(mockUser);
      Auth0ManagementServiceMock.getAuth0User.mockResolvedValue(mockAuth0User);
      AccountabilityBuddyRepositoryMock.findBuddiesByUserId.mockResolvedValue([existingBuddy]);

      await expect(service.inviteBuddy(userId, buddyEmail)).rejects.toThrow(BadRequestException);
      await expect(service.inviteBuddy(userId, buddyEmail)).rejects.toThrow('This invitation is already pending');
    });

    it('should throw BadRequestException when invitation has expired and resend', async () => {
      const expiredDate = new Date(Date.now() - 1000 * 60 * 60 * 24 * 8); // 8 days ago
      const existingBuddy = new AccountabilityBuddy({
        ...mockAccountabilityBuddy,
        invitation_status: InvitationStatus.PENDING,
        invitation_sent_at: expiredDate,
      });

      UserRepositoryMock.orm.findOneBy.mockResolvedValue(mockUser);
      Auth0ManagementServiceMock.getAuth0User.mockResolvedValue(mockAuth0User);
      AccountabilityBuddyRepositoryMock.findBuddiesByUserId.mockResolvedValue([existingBuddy]);
      AccountabilityBuddyRepositoryMock.update.mockResolvedValue(existingBuddy);

      await expect(service.inviteBuddy(userId, buddyEmail)).rejects.toThrow(BadRequestException);
      await expect(service.inviteBuddy(userId, buddyEmail)).rejects.toThrow(
        'This invitation has expired. A new invitation has been sent.',
      );
      expect(AccountabilityBuddyRepositoryMock.update).toHaveBeenCalled();
    });

    it('should throw BadRequestException when user is already a buddy', async () => {
      const existingBuddy = new AccountabilityBuddy({
        ...mockAccountabilityBuddy,
        invitation_status: InvitationStatus.ACCEPTED,
      });

      UserRepositoryMock.orm.findOneBy.mockResolvedValue(mockUser);
      Auth0ManagementServiceMock.getAuth0User.mockResolvedValue(mockAuth0User);
      AccountabilityBuddyRepositoryMock.findBuddiesByUserId.mockResolvedValue([existingBuddy]);

      await expect(service.inviteBuddy(userId, buddyEmail)).rejects.toThrow(BadRequestException);
      await expect(service.inviteBuddy(userId, buddyEmail)).rejects.toThrow(
        'This user is already your accountability buddy',
      );
    });

    it('should successfully invite a buddy', async () => {
      const savedBuddy = new AccountabilityBuddy({
        ...mockAccountabilityBuddy,
        id: accountabilityBuddyId,
      });

      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(mockUser);
      Auth0ManagementServiceMock.getAuth0User.mockResolvedValueOnce(mockAuth0User);
      AccountabilityBuddyRepositoryMock.findBuddiesByUserId.mockResolvedValueOnce([]);
      Auth0ManagementServiceMock.getAuth0UsersWithEmail.mockResolvedValueOnce([mockBuddyAuth0User]);
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(mockBuddyUser);
      AccountabilityBuddyRepositoryMock.create.mockResolvedValueOnce(savedBuddy);
      AccountabilityTokenServiceMock.generateInvitationToken.mockResolvedValueOnce('invitation-token');
      AccountabilityEmailServiceMock.getFrontendBaseUrl.mockReturnValue('https://app.example.com');
      AccountabilityEmailServiceMock.sendBuddyInvitationEmail.mockResolvedValueOnce(undefined);
      AccountabilityNotificationServiceMock.createBuddyInvitationNotification.mockResolvedValueOnce({} as any);

      const result = await service.inviteBuddy(userId, buddyEmail);

      expect(result).toEqual(savedBuddy);
      expect(AccountabilityBuddyRepositoryMock.create).toHaveBeenCalled();
      expect(AccountabilityEmailServiceMock.sendBuddyInvitationEmail).toHaveBeenCalled();
      expect(AccountabilityNotificationServiceMock.createBuddyInvitationNotification).toHaveBeenCalled();
    });

    it('should successfully invite a buddy who is not yet registered', async () => {
      const savedBuddy = new AccountabilityBuddy({
        ...mockAccountabilityBuddy,
        id: accountabilityBuddyId,
        buddy_user_id: undefined,
      });

      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(mockUser);
      Auth0ManagementServiceMock.getAuth0User.mockResolvedValueOnce(mockAuth0User);
      AccountabilityBuddyRepositoryMock.findBuddiesByUserId.mockResolvedValueOnce([]);
      Auth0ManagementServiceMock.getAuth0UsersWithEmail.mockResolvedValueOnce([]);
      AccountabilityBuddyRepositoryMock.create.mockResolvedValueOnce(savedBuddy);
      AccountabilityTokenServiceMock.generateInvitationToken.mockResolvedValueOnce('invitation-token');
      AccountabilityEmailServiceMock.getFrontendBaseUrl.mockReturnValue('https://app.example.com');
      AccountabilityEmailServiceMock.sendBuddyInvitationEmail.mockResolvedValueOnce(undefined);
      AccountabilityNotificationServiceMock.createBuddyInvitationNotification.mockResolvedValueOnce({} as any);

      const result = await service.inviteBuddy(userId, buddyEmail);

      expect(result).toEqual(savedBuddy);
      expect(AccountabilityBuddyRepositoryMock.create).toHaveBeenCalled();
    });
  });

  describe('acceptInvitation', () => {
    const token = 'valid-invitation-token';
    const payload: BuddyInvitationPayload = {
      user_id: userId,
      buddy_email: buddyEmail,
      accountability_buddy_id: accountabilityBuddyId,
    };

    it('should throw UnauthorizedException for invalid token', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValue(mockBuddyUser);
      AccountabilityTokenServiceMock.verifyInvitationToken.mockRejectedValue(new Error('Invalid token'));

      await expect(service.acceptInvitation(token, buddyUserId)).rejects.toThrow(UnauthorizedException);
      await expect(service.acceptInvitation(token, buddyUserId)).rejects.toThrow('Invalid or expired invitation token');
    });

    it('should throw NotFoundException when accountability buddy not found', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValue(mockBuddyUser);
      AccountabilityTokenServiceMock.verifyInvitationToken.mockResolvedValue(payload);
      AccountabilityBuddyRepositoryMock.findBuddyById.mockResolvedValue(null);

      await expect(service.acceptInvitation(token, buddyUserId)).rejects.toThrow(NotFoundException);
      await expect(service.acceptInvitation(token, buddyUserId)).rejects.toThrow(
        'Accountability buddy invitation not found',
      );
    });

    it('should throw UnauthorizedException when invitation is not for the user', async () => {
      const wrongBuddy = new AccountabilityBuddy({
        ...mockAccountabilityBuddy,
        user_id: 'different-user-id',
      });

      UserRepositoryMock.orm.findOneBy.mockResolvedValue(mockBuddyUser);
      AccountabilityTokenServiceMock.verifyInvitationToken.mockResolvedValue(payload);
      AccountabilityBuddyRepositoryMock.findBuddyById.mockResolvedValue(wrongBuddy);

      await expect(service.acceptInvitation(token, buddyUserId)).rejects.toThrow(UnauthorizedException);
      await expect(service.acceptInvitation(token, buddyUserId)).rejects.toThrow(
        'This invitation is not for your account',
      );
    });

    it('should throw BadRequestException when invitation is already accepted', async () => {
      const acceptedBuddy = new AccountabilityBuddy({
        ...mockAccountabilityBuddy,
        invitation_status: InvitationStatus.ACCEPTED,
      });

      UserRepositoryMock.orm.findOneBy.mockResolvedValue(mockBuddyUser);
      AccountabilityTokenServiceMock.verifyInvitationToken.mockResolvedValue(payload);
      AccountabilityBuddyRepositoryMock.findBuddyById.mockResolvedValue(acceptedBuddy);

      await expect(service.acceptInvitation(token, buddyUserId)).rejects.toThrow(BadRequestException);
      await expect(service.acceptInvitation(token, buddyUserId)).rejects.toThrow(
        'This invitation has already been accepted',
      );
    });

    it('should successfully accept an invitation', async () => {
      const updatedBuddy = new AccountabilityBuddy({
        ...mockAccountabilityBuddy,
        buddy_user_id: buddyUserId,
        invitation_status: InvitationStatus.ACCEPTED,
        invitation_responded_at: new Date(),
      });

      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(mockBuddyUser);
      AccountabilityTokenServiceMock.verifyInvitationToken.mockResolvedValueOnce(payload);
      AccountabilityBuddyRepositoryMock.findBuddyById.mockResolvedValueOnce(mockAccountabilityBuddy);
      AccountabilityBuddyRepositoryMock.update.mockResolvedValueOnce(updatedBuddy);
      // Note: Service calls getAuth0User with buddyUserId (user_id), not auth0_id
      Auth0ManagementServiceMock.getAuth0User.mockResolvedValueOnce(mockBuddyAuth0User);
      AccountabilityNotificationServiceMock.createInvitationAcceptedNotification.mockResolvedValueOnce({} as any);

      const result = await service.acceptInvitation(token, buddyUserId);

      expect(result).toEqual(updatedBuddy);
      expect(AccountabilityBuddyRepositoryMock.update).toHaveBeenCalled();
      expect(AccountabilityNotificationServiceMock.createInvitationAcceptedNotification).toHaveBeenCalled();
    });
  });

  describe('getBuddies', () => {
    it('should return list of buddies for a user', async () => {
      const buddies = [mockAccountabilityBuddy];
      AccountabilityBuddyRepositoryMock.findBuddiesByUserId.mockResolvedValueOnce(buddies);

      const result = await service.getBuddies(userId);

      expect(result).toEqual(buddies);
      expect(AccountabilityBuddyRepositoryMock.findBuddiesByUserId).toHaveBeenCalledWith(userId);
    });
  });

  describe('getReceivedInvitations', () => {
    const receivedInvitation = new AccountabilityBuddy({
      ...mockAccountabilityBuddy,
      user_id: 'other-user-id',
      buddy_user_id: userId,
      invitation_status: InvitationStatus.PENDING,
    });

    it('should return all received invitations when no status filter is provided', async () => {
      const invitations = [receivedInvitation];
      AccountabilityBuddyRepositoryMock.findByBuddyUserId.mockResolvedValueOnce(invitations);

      const result = await service.getReceivedInvitations(userId, {});

      expect(result).toEqual(invitations);
      expect(AccountabilityBuddyRepositoryMock.findByBuddyUserId).toHaveBeenCalledWith(userId, undefined);
    });

    it('should return received invitations filtered by status', async () => {
      const pendingInvitations = [receivedInvitation];
      AccountabilityBuddyRepositoryMock.findByBuddyUserId.mockResolvedValueOnce(pendingInvitations);

      const result = await service.getReceivedInvitations(userId, { status: InvitationStatus.PENDING });

      expect(result).toEqual(pendingInvitations);
      expect(AccountabilityBuddyRepositoryMock.findByBuddyUserId).toHaveBeenCalledWith(
        userId,
        InvitationStatus.PENDING,
      );
    });

    it('should return accepted invitations when status filter is accepted', async () => {
      const acceptedInvitation = new AccountabilityBuddy({
        ...receivedInvitation,
        invitation_status: InvitationStatus.ACCEPTED,
      });
      AccountabilityBuddyRepositoryMock.findByBuddyUserId.mockResolvedValueOnce([acceptedInvitation]);

      const result = await service.getReceivedInvitations(userId, { status: InvitationStatus.ACCEPTED });

      expect(result).toEqual([acceptedInvitation]);
      expect(AccountabilityBuddyRepositoryMock.findByBuddyUserId).toHaveBeenCalledWith(
        userId,
        InvitationStatus.ACCEPTED,
      );
    });

    it('should return empty array when no invitations are found', async () => {
      AccountabilityBuddyRepositoryMock.findByBuddyUserId.mockResolvedValueOnce([]);

      const result = await service.getReceivedInvitations(userId, {});

      expect(result).toEqual([]);
      expect(AccountabilityBuddyRepositoryMock.findByBuddyUserId).toHaveBeenCalledWith(userId, undefined);
    });

    it('should handle errors and rethrow them', async () => {
      const error = new Error('Database error');
      AccountabilityBuddyRepositoryMock.findByBuddyUserId.mockRejectedValueOnce(error);

      await expect(service.getReceivedInvitations(userId, {})).rejects.toThrow('Database error');
    });
  });

  describe('removeBuddy', () => {
    it('should throw NotFoundException when buddy relationship not found', async () => {
      AccountabilityBuddyRepositoryMock.findUserBuddy.mockResolvedValueOnce(null);

      await expect(service.removeBuddy(userId, accountabilityBuddyId)).rejects.toThrow(NotFoundException);
      await expect(service.removeBuddy(userId, accountabilityBuddyId)).rejects.toThrow(
        'Accountability buddy relationship not found',
      );
    });

    it('should successfully remove a buddy', async () => {
      AccountabilityBuddyRepositoryMock.findUserBuddy.mockResolvedValueOnce(mockAccountabilityBuddy);
      AccountabilityBuddyRepositoryMock.deleteBuddyById.mockResolvedValueOnce(undefined);

      await service.removeBuddy(userId, accountabilityBuddyId);

      expect(AccountabilityBuddyRepositoryMock.deleteBuddyById).toHaveBeenCalledWith(accountabilityBuddyId);
    });
  });

  describe('getBuddyById', () => {
    it('should throw NotFoundException when buddy not found', async () => {
      AccountabilityBuddyRepositoryMock.findUserBuddy.mockResolvedValueOnce(null);

      await expect(service.getBuddyById(accountabilityBuddyId, userId)).rejects.toThrow(NotFoundException);
      await expect(service.getBuddyById(accountabilityBuddyId, userId)).rejects.toThrow(
        'Accountability buddy not found',
      );
    });

    it('should return buddy when found', async () => {
      AccountabilityBuddyRepositoryMock.findUserBuddy.mockResolvedValueOnce(mockAccountabilityBuddy);

      const result = await service.getBuddyById(accountabilityBuddyId, userId);

      expect(result).toEqual(mockAccountabilityBuddy);
      expect(AccountabilityBuddyRepositoryMock.findUserBuddy).toHaveBeenCalledWith(userId, accountabilityBuddyId);
    });
  });

  describe('linkPendingInvitationsForNewUser', () => {
    it('should link pending invitations for a new user', async () => {
      const pendingInvitation = new AccountabilityBuddy({
        ...mockAccountabilityBuddy,
        buddy_user_id: undefined,
        invitation_status: InvitationStatus.PENDING,
      });

      AccountabilityBuddyRepositoryMock.findBuddiesPendingInvitations.mockResolvedValueOnce([pendingInvitation]);
      AccountabilityBuddyRepositoryMock.update.mockResolvedValueOnce(pendingInvitation);

      await service.linkPendingInvitationsForNewUser(buddyUserId, buddyEmail);

      expect(AccountabilityBuddyRepositoryMock.findBuddiesPendingInvitations).toHaveBeenCalled();
      expect(AccountabilityBuddyRepositoryMock.update).toHaveBeenCalledWith(pendingInvitation.id, {
        buddy_user_id: buddyUserId,
      });
    });

    it('should not link if invitation already has buddy_user_id', async () => {
      const pendingInvitation = new AccountabilityBuddy({
        ...mockAccountabilityBuddy,
        buddy_user_id: 'existing-user-id',
        invitation_status: InvitationStatus.PENDING,
      });

      AccountabilityBuddyRepositoryMock.findBuddiesPendingInvitations.mockResolvedValueOnce([pendingInvitation]);

      await service.linkPendingInvitationsForNewUser(buddyUserId, buddyEmail);

      expect(AccountabilityBuddyRepositoryMock.findBuddiesPendingInvitations).toHaveBeenCalled();
      expect(AccountabilityBuddyRepositoryMock.update).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      AccountabilityBuddyRepositoryMock.findBuddiesPendingInvitations.mockRejectedValueOnce(
        new Error('Database error'),
      );

      await expect(service.linkPendingInvitationsForNewUser(buddyUserId, buddyEmail)).resolves.not.toThrow();
    });
  });

  describe('acceptInvitationById', () => {
    it('should successfully accept invitation when buddy_user_id is set', async () => {
      const invitation = new AccountabilityBuddy({
        ...mockAccountabilityBuddy,
        invitation_status: InvitationStatus.PENDING,
        invitation_sent_at: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago (not expired)
      });

      const updatedInvitation = new AccountabilityBuddy({
        ...invitation,
        invitation_status: InvitationStatus.ACCEPTED,
        invitation_responded_at: new Date(),
      });

      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(mockBuddyUser);
      AccountabilityBuddyRepositoryMock.findBuddyById.mockResolvedValueOnce(invitation);
      AccountabilityBuddyRepositoryMock.update.mockResolvedValueOnce(updatedInvitation);
      Auth0ManagementServiceMock.getAuth0User.mockResolvedValueOnce(mockBuddyAuth0User);
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(mockUser);
      AccountabilityNotificationServiceMock.createInvitationAcceptedNotification.mockResolvedValueOnce({} as any);

      const result = await service.acceptInvitationById(accountabilityBuddyId, buddyUserId);

      expect(result).toEqual(updatedInvitation);
      expect(AccountabilityBuddyRepositoryMock.findBuddyById).toHaveBeenCalledWith(accountabilityBuddyId);
      expect(AccountabilityBuddyRepositoryMock.update).toHaveBeenCalled();
      expect(AccountabilityNotificationServiceMock.createInvitationAcceptedNotification).toHaveBeenCalled();
    });

    it('should successfully accept invitation and update buddy_user_id when null', async () => {
      const invitation = new AccountabilityBuddy({
        ...mockAccountabilityBuddy,
        buddy_user_id: undefined,
        invitation_status: InvitationStatus.PENDING,
        invitation_sent_at: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago (not expired)
      });

      const updatedInvitation = new AccountabilityBuddy({
        ...invitation,
        buddy_user_id: buddyUserId,
        invitation_status: InvitationStatus.ACCEPTED,
        invitation_responded_at: new Date(),
      });

      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(mockBuddyUser);
      AccountabilityBuddyRepositoryMock.findBuddyById.mockResolvedValueOnce(invitation);
      AccountabilityBuddyRepositoryMock.update.mockResolvedValueOnce(updatedInvitation);
      Auth0ManagementServiceMock.getAuth0User.mockResolvedValueOnce(mockBuddyAuth0User);
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(mockUser);
      AccountabilityNotificationServiceMock.createInvitationAcceptedNotification.mockResolvedValueOnce({} as any);

      const result = await service.acceptInvitationById(accountabilityBuddyId, buddyUserId);

      expect(result).toEqual(updatedInvitation);
      expect(AccountabilityBuddyRepositoryMock.update).toHaveBeenCalledWith(
        accountabilityBuddyId,
        expect.objectContaining({
          buddy_user_id: buddyUserId,
          invitation_status: InvitationStatus.ACCEPTED,
        }),
      );
    });

    it('should accept invitation when buddy_user_id is null but email matches', async () => {
      const invitation = new AccountabilityBuddy({
        ...mockAccountabilityBuddy,
        buddy_user_id: undefined,
        invitation_status: InvitationStatus.PENDING,
        invitation_sent_at: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago (not expired)
      });

      const updatedInvitation = new AccountabilityBuddy({
        ...invitation,
        buddy_user_id: buddyUserId,
        invitation_status: InvitationStatus.ACCEPTED,
        invitation_responded_at: new Date(),
      });

      UserRepositoryMock.orm.findOneBy
        .mockResolvedValueOnce(mockBuddyUser) // validateUser
        .mockResolvedValueOnce(mockBuddyUser); // email fallback check
      AccountabilityBuddyRepositoryMock.findBuddyById.mockResolvedValueOnce(invitation);
      Auth0ManagementServiceMock.getAuth0User.mockResolvedValueOnce(mockBuddyAuth0User);
      AccountabilityBuddyRepositoryMock.update.mockResolvedValueOnce(updatedInvitation);
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(mockUser);
      AccountabilityNotificationServiceMock.createInvitationAcceptedNotification.mockResolvedValueOnce({} as any);

      const result = await service.acceptInvitationById(accountabilityBuddyId, buddyUserId);

      expect(result).toEqual(updatedInvitation);
    });

    it('should throw NotFoundException when invitation not found', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValue(mockBuddyUser);
      AccountabilityBuddyRepositoryMock.findBuddyById.mockResolvedValue(null);

      await expect(service.acceptInvitationById(accountabilityBuddyId, buddyUserId)).rejects.toThrow(NotFoundException);
      await expect(service.acceptInvitationById(accountabilityBuddyId, buddyUserId)).rejects.toThrow(
        'Accountability buddy invitation not found',
      );
    });

    it('should throw UnauthorizedException when buddy_user_id does not match', async () => {
      const invitation = new AccountabilityBuddy({
        ...mockAccountabilityBuddy,
        buddy_user_id: 'different-user-id',
        invitation_status: InvitationStatus.PENDING,
      });

      UserRepositoryMock.orm.findOneBy.mockResolvedValue(mockBuddyUser);
      AccountabilityBuddyRepositoryMock.findBuddyById.mockResolvedValue(invitation);

      await expect(service.acceptInvitationById(accountabilityBuddyId, buddyUserId)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.acceptInvitationById(accountabilityBuddyId, buddyUserId)).rejects.toThrow(
        'You are not authorized to accept/reject this invitation',
      );
    });

    it('should throw UnauthorizedException when email does not match and buddy_user_id is null', async () => {
      const invitation = new AccountabilityBuddy({
        ...mockAccountabilityBuddy,
        buddy_user_id: undefined,
        buddy_email: 'different@example.com',
        invitation_status: InvitationStatus.PENDING,
      });

      UserRepositoryMock.orm.findOneBy.mockResolvedValue(mockBuddyUser);
      AccountabilityBuddyRepositoryMock.findBuddyById.mockResolvedValue(invitation);
      Auth0ManagementServiceMock.getAuth0User.mockResolvedValue(mockBuddyAuth0User);

      await expect(service.acceptInvitationById(accountabilityBuddyId, buddyUserId)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.acceptInvitationById(accountabilityBuddyId, buddyUserId)).rejects.toThrow(
        'You are not authorized to accept/reject this invitation',
      );
    });

    it('should throw BadRequestException when user tries to accept invitation they sent', async () => {
      const invitation = new AccountabilityBuddy({
        ...mockAccountabilityBuddy,
        user_id: buddyUserId, // User sent this invitation
        invitation_status: InvitationStatus.PENDING,
      });

      UserRepositoryMock.orm.findOneBy.mockResolvedValue(mockBuddyUser);
      AccountabilityBuddyRepositoryMock.findBuddyById.mockResolvedValue(invitation);

      await expect(service.acceptInvitationById(accountabilityBuddyId, buddyUserId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.acceptInvitationById(accountabilityBuddyId, buddyUserId)).rejects.toThrow(
        'You cannot accept/reject invitations you sent',
      );
    });

    it('should throw BadRequestException when invitation is already accepted', async () => {
      const invitation = new AccountabilityBuddy({
        ...mockAccountabilityBuddy,
        invitation_status: InvitationStatus.ACCEPTED,
      });

      UserRepositoryMock.orm.findOneBy.mockResolvedValue(mockBuddyUser);
      AccountabilityBuddyRepositoryMock.findBuddyById.mockResolvedValue(invitation);

      await expect(service.acceptInvitationById(accountabilityBuddyId, buddyUserId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.acceptInvitationById(accountabilityBuddyId, buddyUserId)).rejects.toThrow(
        'This invitation has already been accepted',
      );
    });

    it('should throw BadRequestException when invitation is already rejected', async () => {
      const invitation = new AccountabilityBuddy({
        ...mockAccountabilityBuddy,
        invitation_status: InvitationStatus.REJECTED,
      });

      UserRepositoryMock.orm.findOneBy.mockResolvedValue(mockBuddyUser);
      AccountabilityBuddyRepositoryMock.findBuddyById.mockResolvedValue(invitation);

      await expect(service.acceptInvitationById(accountabilityBuddyId, buddyUserId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.acceptInvitationById(accountabilityBuddyId, buddyUserId)).rejects.toThrow(
        'This invitation has been rejected',
      );
    });

    it('should throw BadRequestException when invitation is expired', async () => {
      const expiredDate = new Date(Date.now() - 1000 * 60 * 60 * 24 * 2); // 2 days ago
      const invitation = new AccountabilityBuddy({
        ...mockAccountabilityBuddy,
        invitation_status: InvitationStatus.PENDING,
        invitation_sent_at: expiredDate,
      });

      UserRepositoryMock.orm.findOneBy.mockResolvedValue(mockBuddyUser);
      AccountabilityBuddyRepositoryMock.findBuddyById.mockResolvedValue(invitation);

      await expect(service.acceptInvitationById(accountabilityBuddyId, buddyUserId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.acceptInvitationById(accountabilityBuddyId, buddyUserId)).rejects.toThrow(
        'This invitation has expired',
      );
    });

    it('should throw NotFoundException when user does not exist', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValue(null);

      await expect(service.acceptInvitationById(accountabilityBuddyId, buddyUserId)).rejects.toThrow(NotFoundException);
      await expect(service.acceptInvitationById(accountabilityBuddyId, buddyUserId)).rejects.toThrow(
        `User with ID: ${buddyUserId} does not exist`,
      );
    });
  });

  describe('rejectInvitationById', () => {
    it('should successfully reject invitation when buddy_user_id is set', async () => {
      const invitation = new AccountabilityBuddy({
        ...mockAccountabilityBuddy,
        invitation_status: InvitationStatus.PENDING,
        invitation_sent_at: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
      });

      const updatedInvitation = new AccountabilityBuddy({
        ...invitation,
        invitation_status: InvitationStatus.REJECTED,
        invitation_responded_at: new Date(),
      });

      UserRepositoryMock.orm.findOneBy.mockResolvedValue(mockBuddyUser);
      AccountabilityBuddyRepositoryMock.findBuddyById.mockResolvedValue(invitation);
      AccountabilityBuddyRepositoryMock.update.mockResolvedValue(updatedInvitation);

      const result = await service.rejectInvitationById(accountabilityBuddyId, buddyUserId);

      expect(result).toEqual(updatedInvitation);
      expect(AccountabilityBuddyRepositoryMock.findBuddyById).toHaveBeenCalledWith(accountabilityBuddyId);
      expect(AccountabilityBuddyRepositoryMock.update).toHaveBeenCalledWith(
        accountabilityBuddyId,
        expect.objectContaining({
          invitation_status: InvitationStatus.REJECTED,
        }),
      );
    });

    it('should successfully reject invitation and update buddy_user_id when null', async () => {
      const invitation = new AccountabilityBuddy({
        ...mockAccountabilityBuddy,
        buddy_user_id: undefined,
        invitation_status: InvitationStatus.PENDING,
        invitation_sent_at: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
      });

      const updatedInvitation = new AccountabilityBuddy({
        ...invitation,
        buddy_user_id: buddyUserId,
        invitation_status: InvitationStatus.REJECTED,
        invitation_responded_at: new Date(),
      });

      UserRepositoryMock.orm.findOneBy.mockResolvedValue(mockBuddyUser);
      AccountabilityBuddyRepositoryMock.findBuddyById.mockResolvedValue(invitation);
      AccountabilityBuddyRepositoryMock.update.mockResolvedValue(updatedInvitation);

      const result = await service.rejectInvitationById(accountabilityBuddyId, buddyUserId);

      expect(result).toEqual(updatedInvitation);
      expect(AccountabilityBuddyRepositoryMock.update).toHaveBeenCalledWith(
        accountabilityBuddyId,
        expect.objectContaining({
          buddy_user_id: buddyUserId,
          invitation_status: InvitationStatus.REJECTED,
        }),
      );
    });

    it('should allow rejecting expired invitation', async () => {
      const expiredDate = new Date(Date.now() - 1000 * 60 * 60 * 24 * 2); // 2 days ago
      const invitation = new AccountabilityBuddy({
        ...mockAccountabilityBuddy,
        invitation_status: InvitationStatus.PENDING,
        invitation_sent_at: expiredDate,
      });

      const updatedInvitation = new AccountabilityBuddy({
        ...invitation,
        invitation_status: InvitationStatus.REJECTED,
        invitation_responded_at: new Date(),
      });

      UserRepositoryMock.orm.findOneBy.mockResolvedValue(mockBuddyUser);
      AccountabilityBuddyRepositoryMock.findBuddyById.mockResolvedValue(invitation);
      AccountabilityBuddyRepositoryMock.update.mockResolvedValue(updatedInvitation);

      const result = await service.rejectInvitationById(accountabilityBuddyId, buddyUserId);

      expect(result).toEqual(updatedInvitation);
      expect(AccountabilityBuddyRepositoryMock.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException when invitation not found', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValue(mockBuddyUser);
      AccountabilityBuddyRepositoryMock.findBuddyById.mockResolvedValue(null);

      await expect(service.rejectInvitationById(accountabilityBuddyId, buddyUserId)).rejects.toThrow(NotFoundException);
      await expect(service.rejectInvitationById(accountabilityBuddyId, buddyUserId)).rejects.toThrow(
        'Accountability buddy invitation not found',
      );
    });

    it('should throw UnauthorizedException when buddy_user_id does not match', async () => {
      const invitation = new AccountabilityBuddy({
        ...mockAccountabilityBuddy,
        buddy_user_id: 'different-user-id',
        invitation_status: InvitationStatus.PENDING,
      });

      UserRepositoryMock.orm.findOneBy.mockResolvedValue(mockBuddyUser);
      AccountabilityBuddyRepositoryMock.findBuddyById.mockResolvedValue(invitation);

      await expect(service.rejectInvitationById(accountabilityBuddyId, buddyUserId)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.rejectInvitationById(accountabilityBuddyId, buddyUserId)).rejects.toThrow(
        'You are not authorized to accept/reject this invitation',
      );
    });

    it('should throw BadRequestException when user tries to reject invitation they sent', async () => {
      const invitation = new AccountabilityBuddy({
        ...mockAccountabilityBuddy,
        user_id: buddyUserId, // User sent this invitation
        invitation_status: InvitationStatus.PENDING,
      });

      UserRepositoryMock.orm.findOneBy.mockResolvedValue(mockBuddyUser);
      AccountabilityBuddyRepositoryMock.findBuddyById.mockResolvedValue(invitation);

      await expect(service.rejectInvitationById(accountabilityBuddyId, buddyUserId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.rejectInvitationById(accountabilityBuddyId, buddyUserId)).rejects.toThrow(
        'You cannot accept/reject invitations you sent',
      );
    });

    it('should throw BadRequestException when invitation is already accepted', async () => {
      const invitation = new AccountabilityBuddy({
        ...mockAccountabilityBuddy,
        invitation_status: InvitationStatus.ACCEPTED,
      });

      UserRepositoryMock.orm.findOneBy.mockResolvedValue(mockBuddyUser);
      AccountabilityBuddyRepositoryMock.findBuddyById.mockResolvedValue(invitation);

      await expect(service.rejectInvitationById(accountabilityBuddyId, buddyUserId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.rejectInvitationById(accountabilityBuddyId, buddyUserId)).rejects.toThrow(
        'This invitation has already been accepted',
      );
    });

    it('should throw BadRequestException when invitation is already rejected', async () => {
      const invitation = new AccountabilityBuddy({
        ...mockAccountabilityBuddy,
        invitation_status: InvitationStatus.REJECTED,
      });

      UserRepositoryMock.orm.findOneBy.mockResolvedValue(mockBuddyUser);
      AccountabilityBuddyRepositoryMock.findBuddyById.mockResolvedValue(invitation);

      await expect(service.rejectInvitationById(accountabilityBuddyId, buddyUserId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.rejectInvitationById(accountabilityBuddyId, buddyUserId)).rejects.toThrow(
        'This invitation has been rejected',
      );
    });
  });
});
