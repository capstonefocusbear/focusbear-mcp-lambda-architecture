import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { I18nService } from 'nestjs-i18n';
import { Auth0ManagementService } from '@app/auth0';
import { AccountabilityBuddyRepository } from '../repositories/accountability-buddy.repository';
import { AccountabilityBuddy } from '../entities/accountability-buddy.entity';
import { InvitationStatus } from '../domain/invitation-status.enum';
import { AccountabilityTokenService } from './accountability-token.service';
import { AccountabilityEmailService } from './accountability-email.service';
import { AccountabilityNotificationService } from './accountability-notification.service';
import { UserRepository } from '../../user/repositories/user.repository';
import { User } from '../../user/entities/user.entity';
import { ACCOUNTABILITY_BUDDY, EMAIL_SENDER_NAME } from '../../../shared/utils/constants';
import { BuddyInvitationPayload } from '../domain/buddy-invitation-payload.model';
import { isValidEmail } from '../../../shared/utils/helpers';
import { GetInvitationsQueryDto } from '../dto/get-invitations-query.dto';
import { AccountabilityBuddyResponseDto } from '../dto/accountability-buddy-response';
import { BuddyInfoDto } from '../dto/accountability-buddy-response/buddy-info.dto';
import { InviterInfoDto } from '../dto/accountability-buddy-response/inviter-info.dto';

/**
 * Service for managing accountability buddy relationships and invitations.
 *
 * Note on notification error handling:
 * Notification and email operations are wrapped in try-catch blocks to ensure core operations
 * (e.g., accepting/rejecting invitations) succeed even if notification/email services fail.
 * This prevents users from being unable to complete critical actions due to transient
 * notification service issues. Notification failures are logged to Sentry as warnings for monitoring.
 */
@Injectable()
export class AccountabilityBuddyService {
  constructor(
    private readonly accountabilityBuddyRepository: AccountabilityBuddyRepository,
    private readonly userRepository: UserRepository,
    private readonly auth0ManagementService: Auth0ManagementService,
    private readonly tokenService: AccountabilityTokenService,
    private readonly emailService: AccountabilityEmailService,
    private readonly notificationService: AccountabilityNotificationService,
    private readonly i18nService: I18nService,
    @InjectSentry() private readonly sentryService: SentryService,
  ) {}

  async inviteBuddy(userId: string, buddyEmail: string, origin?: string): Promise<AccountabilityBuddy> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Inviting accountability buddy',
        data: { userId, buddyEmail },
      });

      if (!isValidEmail(buddyEmail)) {
        throw new BadRequestException('Invalid email format');
      }

      const user = await this.validateUser(userId);
      const auth0User = await this.auth0ManagementService.getAuth0User(user.auth0_id);

      if (auth0User?.email?.toLowerCase() === buddyEmail.toLowerCase()) {
        throw new BadRequestException('You cannot invite yourself as an accountability buddy');
      }

      const existingBuddies = await this.accountabilityBuddyRepository.findBuddiesByUserId(userId);

      if (existingBuddies.length >= ACCOUNTABILITY_BUDDY.MAX_BUDDIES_PER_USER) {
        throw new BadRequestException(
          `Maximum ${ACCOUNTABILITY_BUDDY.MAX_BUDDIES_PER_USER} accountability buddies allowed per user`,
        );
      }

      const existingBuddy = existingBuddies.find(
        (buddy) => buddy.buddy_email?.toLowerCase() === buddyEmail.toLowerCase(),
      );

      if (existingBuddy) {
        await this.validateExistingBuddyStatus(existingBuddy);
      }

      const [buddyAuth0User] = await this.auth0ManagementService.getAuth0UsersWithEmail(buddyEmail);
      const buddyUserId = buddyAuth0User?.user_id ? await this.getUserIdByAuth0Id(buddyAuth0User.user_id) : undefined;

      const accountabilityBuddy = new AccountabilityBuddy({
        user_id: userId,
        buddy_email: buddyEmail,
        buddy_user_id: buddyUserId,
        invitation_status: InvitationStatus.PENDING,
        invitation_sent_at: new Date(),
      });

      const savedBuddy = await this.accountabilityBuddyRepository.create(accountabilityBuddy);

      const inviteUrl = await this.generateInvitationUrl(userId, buddyEmail, savedBuddy.id, origin);

      // Get buddy user language if registered
      let buddyLang = 'en';
      if (buddyUserId) {
        const buddyUser = await this.userRepository.orm.findOneBy({ id: buddyUserId });
        buddyLang = buddyUser?.language || 'en';
      }

      const invitationTitle = this.i18nService.t('common.accountability_buddy_invitation_title', {
        lang: buddyLang,
        args: { userName: auth0User?.name || 'A user', appName: EMAIL_SENDER_NAME },
      });
      const invitationDescription = this.i18nService.t('common.accountability_buddy_invitation_description', {
        lang: buddyLang,
      });

      try {
        await this.emailService.sendBuddyInvitationEmail(buddyEmail, inviteUrl, auth0User?.name);
        // If buddy is registered, notify them
        if (buddyUserId) {
          await this.notificationService.createBuddyInvitationNotification(
            buddyUserId,
            savedBuddy.id,
            inviteUrl,
            invitationTitle,
            invitationDescription,
          );
        }
      } catch (notificationError) {
        // Log notification/email failure but don't fail the operation
        this.sentryService.instance().captureException(notificationError, {
          level: 'warning',
          tags: { operation: 'invite_buddy_notification' },
        });
      }

      return savedBuddy;
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async acceptInvitation(token: string, buddyUserId: string): Promise<AccountabilityBuddy> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Accepting accountability buddy invitation',
        data: { buddyUserId },
      });

      await this.validateUser(buddyUserId);

      let payload: BuddyInvitationPayload;
      try {
        payload = await this.tokenService.verifyInvitationToken(token);
      } catch (error) {
        throw new UnauthorizedException('Invalid or expired invitation token');
      }

      const accountabilityBuddy = await this.validateAccountabilityBuddyAndEmail(payload);

      accountabilityBuddy.buddy_user_id = buddyUserId;
      accountabilityBuddy.invitation_status = InvitationStatus.ACCEPTED;
      accountabilityBuddy.invitation_responded_at = new Date();

      const updatedBuddy = await this.accountabilityBuddyRepository.update(accountabilityBuddy.id, accountabilityBuddy);

      try {
        const buddyAuth0 = await this.auth0ManagementService.getAuth0User(buddyUserId);
        const requesterUser = await this.userRepository.orm.findOneBy({ id: payload.user_id });
        const requesterLang = requesterUser?.language || 'en';

        const acceptedTitle = this.i18nService.t('common.accountability_buddy_invitation_accepted_title', {
          lang: requesterLang,
          args: { buddyName: buddyAuth0?.name || buddyAuth0?.email },
        });
        const acceptedDescription = this.i18nService.t('common.accountability_buddy_invitation_accepted_description', {
          lang: requesterLang,
        });

        await this.notificationService.createInvitationAcceptedNotification(
          payload.user_id,
          accountabilityBuddy.id,
          acceptedTitle,
          acceptedDescription,
        );
      } catch (notificationError) {
        // Log notification failure but don't fail the operation
        this.sentryService.instance().captureException(notificationError, {
          level: 'warning',
          tags: { operation: 'accept_invitation_notification' },
        });
      }

      return updatedBuddy;
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async getBuddies(userId: string): Promise<AccountabilityBuddy[]> {
    try {
      return await this.accountabilityBuddyRepository.findBuddiesByUserId(userId);
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async getReceivedInvitations(
    userId: string,
    query: GetInvitationsQueryDto,
  ): Promise<AccountabilityBuddyResponseDto[]> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Getting received invitations',
        data: { userId, ...query },
      });

      const invitations = await this.accountabilityBuddyRepository.findByBuddyUserId(userId, query.status);
      const results = await Promise.allSettled(
        invitations.map((invitation) => this.transformInvitationToResponse(invitation)),
      );

      const transformedInvitations = results
        .map((result, index) => {
          if (result.status === 'fulfilled') {
            return result.value;
          }
          // Log unexpected errors (shouldn't happen since transformInvitationToResponse has error handling)
          this.sentryService.instance().captureException(result.reason, {
            level: 'error',
            tags: {
              operation: 'transform_invitation_to_response',
              invitation_id: invitations[index]?.id,
            },
          });
          return null;
        })
        .filter((invitation): invitation is AccountabilityBuddyResponseDto => invitation !== null);

      return transformedInvitations;
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async removeBuddy(userId: string, buddyId: string): Promise<void> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Removing accountability buddy',
        data: { userId, buddyId },
      });

      const accountabilityBuddy = await this.accountabilityBuddyRepository.findUserBuddy(userId, buddyId);

      if (!accountabilityBuddy) {
        throw new NotFoundException('Accountability buddy relationship not found');
      }

      await this.accountabilityBuddyRepository.deleteBuddyById(buddyId);
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async getBuddyById(buddyId: string, userId: string): Promise<AccountabilityBuddy> {
    const buddy = await this.accountabilityBuddyRepository.findUserBuddy(userId, buddyId);

    if (!buddy) {
      throw new NotFoundException('Accountability buddy not found');
    }

    return buddy;
  }

  /**
   * Links pending accountability buddy invitations to a newly registered user.
   * When a user registers with an email that was previously invited as an accountability buddy,
   * this method finds all pending invitations for that email and links them to the new user's ID.
   * The invitation status remains PENDING, requiring the user to explicitly accept the invitation.
   *
   * @param userId - The ID of the newly registered user
   * @param email - The email address of the newly registered user (used to match pending invitations)
   */
  async linkPendingInvitationsForNewUser(userId: string, email: string): Promise<void> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Linking pending accountability buddy invitations for new user',
        data: { userId, email },
      });

      const allPendingInvitations = await this.accountabilityBuddyRepository.findBuddiesPendingInvitations(userId);

      const invitationsToUpdate = allPendingInvitations
        .filter((invitation) => invitation.buddy_email?.toLowerCase() === email.toLowerCase())
        .filter((invitation) => !invitation.buddy_user_id);

      await Promise.allSettled(
        invitationsToUpdate.map((invitation) =>
          this.accountabilityBuddyRepository.update(invitation.id, {
            buddy_user_id: userId,
          }),
        ),
      );
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
    }
  }

  private async generateInvitationUrl(
    userId: string,
    buddyEmail: string,
    accountabilityBuddyId: string,
    origin?: string,
  ): Promise<string> {
    const token = await this.tokenService.generateInvitationToken({
      user_id: userId,
      buddy_email: buddyEmail,
      accountability_buddy_id: accountabilityBuddyId,
    });

    const baseUrl = this.emailService.getFrontendBaseUrl(origin);
    return `${baseUrl}/accountability-buddy/accept?token=${token}`;
  }

  private async getUserIdByAuth0Id(auth0Id: string): Promise<string | undefined> {
    const user = await this.userRepository.orm.findOne({ where: { auth0_id: auth0Id } });
    return user?.id;
  }

  private async validateExistingBuddyStatus(existingBuddy: AccountabilityBuddy): Promise<void> {
    if (existingBuddy.invitation_status === InvitationStatus.PENDING) {
      if (existingBuddy.invitation_sent_at) {
        const daysSinceInvitation =
          (Date.now() - new Date(existingBuddy.invitation_sent_at).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceInvitation >= ACCOUNTABILITY_BUDDY.INVITATION_EXPIRATION_DAYS) {
          await this.accountabilityBuddyRepository.update(existingBuddy.id, {
            invitation_sent_at: new Date(),
          });
          throw new BadRequestException('This invitation has expired. A new invitation has been sent.');
        }
      }
      throw new BadRequestException('This invitation is already pending');
    } else if (existingBuddy.invitation_status === InvitationStatus.ACCEPTED) {
      throw new BadRequestException('This user is already your accountability buddy');
    } else if (existingBuddy.invitation_status === InvitationStatus.REJECTED) {
      throw new BadRequestException('This invitation has been rejected');
    } else if (existingBuddy.invitation_status === InvitationStatus.EXPIRED) {
      throw new BadRequestException('This invitation has expired');
    }
  }

  private async validateAccountabilityBuddyAndEmail(payload: BuddyInvitationPayload): Promise<AccountabilityBuddy> {
    const accountabilityBuddy = await this.accountabilityBuddyRepository.findBuddyById(payload.accountability_buddy_id);

    if (!accountabilityBuddy) {
      throw new NotFoundException('Accountability buddy invitation not found');
    }

    if (
      accountabilityBuddy.user_id !== payload.user_id ||
      accountabilityBuddy.buddy_email?.toLowerCase() !== payload.buddy_email.toLowerCase()
    ) {
      throw new UnauthorizedException('This invitation is not for your account');
    }

    let exceptionMessage = '';

    switch (accountabilityBuddy.invitation_status) {
      case InvitationStatus.ACCEPTED:
        exceptionMessage = 'This invitation has already been accepted';
        break;
      case InvitationStatus.REJECTED:
        exceptionMessage = 'This invitation has been rejected';
        break;
      case InvitationStatus.EXPIRED:
        exceptionMessage = 'This invitation has expired';
        break;
      default:
        exceptionMessage = '';
    }

    if (exceptionMessage) {
      throw new BadRequestException(exceptionMessage);
    }

    return accountabilityBuddy;
  }

  async acceptInvitationById(accountabilityBuddyId: string, buddyUserId: string): Promise<AccountabilityBuddy> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Accepting accountability buddy invitation by ID',
        data: { accountabilityBuddyId, buddyUserId },
      });

      const accountabilityBuddy = await this.validateInvitationForUser(
        accountabilityBuddyId,
        buddyUserId,
        true, // requirePending
      );

      // Check expiration for accept
      if (accountabilityBuddy.invitation_sent_at) {
        const daysSinceInvitation =
          (Date.now() - new Date(accountabilityBuddy.invitation_sent_at).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceInvitation >= ACCOUNTABILITY_BUDDY.INVITATION_EXPIRATION_DAYS) {
          throw new BadRequestException('This invitation has expired');
        }
      }

      // Update buddy_user_id if null
      if (!accountabilityBuddy.buddy_user_id) {
        accountabilityBuddy.buddy_user_id = buddyUserId;
      }

      accountabilityBuddy.invitation_status = InvitationStatus.ACCEPTED;
      accountabilityBuddy.invitation_responded_at = new Date();

      const updatedBuddy = await this.accountabilityBuddyRepository.update(accountabilityBuddy.id, accountabilityBuddy);

      try {
        const buddyAuth0 = await this.auth0ManagementService.getAuth0User(buddyUserId);
        const requesterUser = await this.userRepository.orm.findOneBy({ id: accountabilityBuddy.user_id });
        const requesterLang = requesterUser?.language || 'en';

        const acceptedTitle = this.i18nService.t('common.accountability_buddy_invitation_accepted_title', {
          lang: requesterLang,
          args: { buddyName: buddyAuth0?.name || buddyAuth0?.email },
        });
        const acceptedDescription = this.i18nService.t('common.accountability_buddy_invitation_accepted_description', {
          lang: requesterLang,
        });

        await this.notificationService.createInvitationAcceptedNotification(
          accountabilityBuddy.user_id,
          accountabilityBuddy.id,
          acceptedTitle,
          acceptedDescription,
        );
      } catch (notificationError) {
        // Log notification failure but don't fail the operation
        this.sentryService.instance().captureException(notificationError, {
          level: 'warning',
          tags: { operation: 'accept_invitation_notification' },
        });
      }

      return updatedBuddy;
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async rejectInvitationById(accountabilityBuddyId: string, buddyUserId: string): Promise<AccountabilityBuddy> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Rejecting accountability buddy invitation by ID',
        data: { accountabilityBuddyId, buddyUserId },
      });

      // For reject, we allow expired invitations, so requirePending is false
      const accountabilityBuddy = await this.validateInvitationForUser(
        accountabilityBuddyId,
        buddyUserId,
        false, // requirePending - allow rejecting expired invitations
      );

      // Update buddy_user_id if null
      if (!accountabilityBuddy.buddy_user_id) {
        accountabilityBuddy.buddy_user_id = buddyUserId;
      }

      accountabilityBuddy.invitation_status = InvitationStatus.REJECTED;
      accountabilityBuddy.invitation_responded_at = new Date();

      const updatedBuddy = await this.accountabilityBuddyRepository.update(accountabilityBuddy.id, accountabilityBuddy);

      return updatedBuddy;
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  private async validateInvitationForUser(
    accountabilityBuddyId: string,
    buddyUserId: string,
    requirePending: boolean,
  ): Promise<AccountabilityBuddy> {
    // Find invitation by ID
    const accountabilityBuddy = await this.accountabilityBuddyRepository.findBuddyById(accountabilityBuddyId);

    if (!accountabilityBuddy) {
      throw new NotFoundException('Accountability buddy invitation not found');
    }

    // Validate user exists
    await this.validateUser(buddyUserId);

    // Check authorization
    let isAuthorized = false;

    // Primary check: buddy_user_id matches
    if (accountabilityBuddy.buddy_user_id === buddyUserId) {
      isAuthorized = true;
    } else if (!accountabilityBuddy.buddy_user_id) {
      // Fallback: if buddy_user_id is null, check email match
      const user = await this.userRepository.orm.findOneBy({ id: buddyUserId });
      if (user) {
        const auth0User = await this.auth0ManagementService.getAuth0User(user.auth0_id);
        if (
          auth0User?.email &&
          accountabilityBuddy.buddy_email &&
          auth0User.email.toLowerCase() === accountabilityBuddy.buddy_email.toLowerCase()
        ) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      throw new UnauthorizedException('You are not authorized to accept/reject this invitation');
    }

    // Prevent user from acting on invitations they sent
    if (accountabilityBuddy.user_id === buddyUserId) {
      throw new BadRequestException('You cannot accept/reject invitations you sent');
    }

    // Validate status
    if (requirePending && accountabilityBuddy.invitation_status !== InvitationStatus.PENDING) {
      let exceptionMessage = '';
      switch (accountabilityBuddy.invitation_status) {
        case InvitationStatus.ACCEPTED:
          exceptionMessage = 'This invitation has already been accepted';
          break;
        case InvitationStatus.REJECTED:
          exceptionMessage = 'This invitation has been rejected';
          break;
        case InvitationStatus.EXPIRED:
          exceptionMessage = 'This invitation has expired';
          break;
        default:
          exceptionMessage = 'This invitation is no longer pending';
      }
      throw new BadRequestException(exceptionMessage);
    } else if (!requirePending) {
      // For reject, we allow PENDING and EXPIRED, but not ACCEPTED or REJECTED
      if (accountabilityBuddy.invitation_status === InvitationStatus.ACCEPTED) {
        throw new BadRequestException('This invitation has already been accepted');
      }
      if (accountabilityBuddy.invitation_status === InvitationStatus.REJECTED) {
        throw new BadRequestException('This invitation has been rejected');
      }
    }

    return accountabilityBuddy;
  }

  private async validateUser(userId: string): Promise<User> {
    const user = await this.userRepository.orm.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException(`User with ID: ${userId} does not exist`);
    }
    return user;
  }

  private async transformInvitationToResponse(
    invitation: AccountabilityBuddy,
  ): Promise<AccountabilityBuddyResponseDto> {
    const [inviterInfoResult, buddyInfoResult] = await Promise.allSettled([
      this.getInviterInfo(invitation.user),
      this.getBuddyInfo(invitation),
    ]);

    const inviterInfo =
      inviterInfoResult.status === 'fulfilled'
        ? inviterInfoResult.value
        : {
            id: invitation.user_id,
            email: '',
            first_name: undefined,
            last_name: undefined,
          };

    const buddyInfo =
      buddyInfoResult.status === 'fulfilled'
        ? buddyInfoResult.value
        : {
            id: invitation.buddy_user_id,
            email: '',
            first_name: undefined,
            last_name: undefined,
          };

    return {
      id: invitation.id,
      created_at: invitation.created_at.toString(),
      updated_at: invitation.updated_at.toString(),
      invitation_status: invitation.invitation_status,
      invitation_sent_at: invitation.invitation_sent_at?.toISOString(),
      invitation_responded_at: invitation.invitation_responded_at?.toISOString() || null,
      inviter_info: inviterInfo,
      buddy_info: buddyInfo,
    };
  }

  private async getInviterInfo(inviterUser: User | undefined): Promise<InviterInfoDto> {
    try {
      if (!inviterUser) {
        throw new NotFoundException('Inviter user not found');
      }
      const inviterAuth0 = await this.auth0ManagementService.getAuth0User(inviterUser.auth0_id);
      return {
        id: inviterUser.id,
        email: inviterAuth0?.email || '',
        first_name: inviterAuth0?.given_name,
        last_name: inviterAuth0?.family_name,
      };
    } catch (error) {
      this.sentryService.instance().captureException(error, {
        level: 'warning',
        tags: { operation: 'get_inviter_info' },
      });
      throw new NotFoundException('No inviter information found');
    }
  }

  private async getBuddyInfo(invitation: AccountabilityBuddy): Promise<BuddyInfoDto> {
    if (invitation.buddy_user_id) {
      // Registered buddy
      if (!invitation.buddy) {
        throw new NotFoundException('Buddy user not found');
      }

      try {
        const buddyAuth0 = await this.auth0ManagementService.getAuth0User(invitation.buddy.auth0_id);
        return {
          id: invitation.buddy_user_id,
          email: buddyAuth0?.email || invitation.buddy_email || '',
          first_name: buddyAuth0?.given_name,
          last_name: buddyAuth0?.family_name,
        };
      } catch (error) {
        this.sentryService.instance().captureException(error, {
          level: 'warning',
          tags: { operation: 'get_buddy_info' },
        });
        throw new NotFoundException('No buddy information found');
      }
    } else if (invitation.buddy_email) {
      // Unregistered buddy - use email from invitation
      return {
        id: null,
        email: invitation.buddy_email,
        first_name: undefined,
        last_name: undefined,
      };
    } else {
      // No buddy info at all
      throw new NotFoundException('No buddy information found');
    }
  }
}
