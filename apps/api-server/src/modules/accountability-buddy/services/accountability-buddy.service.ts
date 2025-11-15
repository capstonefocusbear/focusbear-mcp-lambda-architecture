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

  private async validateUser(userId: string): Promise<User> {
    const user = await this.userRepository.orm.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException(`User with ID: ${userId} does not exist`);
    }
    return user;
  }
}
