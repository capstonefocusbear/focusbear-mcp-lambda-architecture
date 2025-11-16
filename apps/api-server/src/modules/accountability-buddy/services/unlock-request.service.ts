import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { I18nService } from 'nestjs-i18n';
import { Auth0ManagementService } from '@app/auth0';
import { UnlockRequestRepository } from '../repositories/unlock-request.repository';
import { AccountabilityBuddyRepository } from '../repositories/accountability-buddy.repository';
import { UnlockRequest } from '../entities/unlock-request.entity';
import { UnlockRequestStatus } from '../domain/unlock-request-status.enum';
import { InvitationStatus } from '../domain/invitation-status.enum';
import { AccountabilityTokenService } from './accountability-token.service';
import { AccountabilityEmailService } from './accountability-email.service';
import { AccountabilityNotificationService } from './accountability-notification.service';
import { UserRepository } from '../../user/repositories/user.repository';
import { User } from '../../user/entities/user.entity';
import { ACCOUNTABILITY_BUDDY } from '../../../shared/utils/constants';
import { UnlockRequestApprovalPayload } from '../domain/unlock-request-approval-payload.model';
import { CreateUnlockRequestDto } from '../dto/create-unlock-request.dto';
import { GetUnlockRequestsQueryDto } from '../dto/get-unlock-requests-query.dto';
import { AccountabilityBuddy } from '../entities/accountability-buddy.entity';
import { PaginationDto } from '../../../shared/pagination/index.dto';
import { PaginationMetaDto } from '../../../shared/pagination/pagination-meta.dto';
import { PageOrder } from '../../../shared/domain/page-order.enum';
import { RejectUnlockRequestDto } from '../dto/reject-unlock-request.dto';
import { ApproveUnlockRequestParamDto } from '../dto/approve-unlock-request-param.dto';

/**
 * Service for managing unlock requests between accountability buddies.
 *
 * Note on notification error handling:
 * Notification and email operations are wrapped in try-catch blocks to ensure core operations
 * (e.g., creating/approving/rejecting unlock requests) succeed even if notification/email services fail.
 * This prevents users from being unable to complete critical actions due to transient
 * notification service issues. Notification failures are logged to Sentry as warnings for monitoring.
 */
@Injectable()
export class UnlockRequestService {
  constructor(
    private readonly unlockRequestRepository: UnlockRequestRepository,
    private readonly accountabilityBuddyRepository: AccountabilityBuddyRepository,
    private readonly userRepository: UserRepository,
    private readonly auth0ManagementService: Auth0ManagementService,
    private readonly tokenService: AccountabilityTokenService,
    private readonly emailService: AccountabilityEmailService,
    private readonly notificationService: AccountabilityNotificationService,
    private readonly i18nService: I18nService,
    @InjectSentry() private readonly sentryService: SentryService,
  ) {}

  async createUnlockRequest(
    userId: string,
    createUnlockRequestDto: CreateUnlockRequestDto,
    origin?: string,
  ): Promise<UnlockRequest> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Creating unlock request',
        data: { userId, ...createUnlockRequestDto },
      });

      const accountabilityBuddy = await this.validateUnlockRequestCreation(
        userId,
        createUnlockRequestDto.accountability_buddy_user_id,
      );

      const unlockRequest = new UnlockRequest({
        user_id: userId,
        accountability_buddy_id: accountabilityBuddy.id,
        reason: createUnlockRequestDto.reason || '',
        unlock_duration_minutes: createUnlockRequestDto.unlock_duration_minutes,
        status: UnlockRequestStatus.PENDING,
      });

      const savedRequest = await this.unlockRequestRepository.create(unlockRequest);

      const buddyUser = await this.validateUser(accountabilityBuddy.buddy_user_id);
      const buddyAuth0 = await this.auth0ManagementService.getAuth0User(buddyUser.auth0_id);
      const requesterUser = await this.validateUser(userId);
      const requesterAuth0 = await this.auth0ManagementService.getAuth0User(requesterUser.auth0_id);

      const buddyLang = buddyUser.language || 'en';

      const token = await this.tokenService.generateApprovalToken({
        unlock_request_id: savedRequest.id,
        user_id: userId,
        buddy_user_id: accountabilityBuddy.buddy_user_id,
      });

      const baseUrl = this.emailService.getFrontendBaseUrl(origin);
      const approvalUrl = `${baseUrl}/accountability-buddy/unlock-request/approve?token=${token}`;

      const unlockRequestTitle = this.i18nService.t('common.accountability_buddy_unlock_request_title', {
        lang: buddyLang,
        args: { userName: requesterAuth0?.name || requesterAuth0?.email },
      });

      try {
        await Promise.allSettled([
          this.emailService.sendUnlockRequestEmail(
            buddyAuth0.email,
            approvalUrl,
            requesterAuth0?.name || requesterAuth0?.email,
            createUnlockRequestDto.reason,
          ),
          this.notificationService.createUnlockRequestNotification(
            accountabilityBuddy.buddy_user_id,
            savedRequest.id,
            approvalUrl,
            unlockRequestTitle,
          ),
        ]);
      } catch (notificationError) {
        // Log notification/email failure but don't fail the operation
        this.sentryService.instance().captureException(notificationError, {
          level: 'warning',
          tags: { operation: 'create_unlock_request_notification' },
        });
      }

      return savedRequest;
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async rejectUnlockRequest(rejectUnlockRequestDto: RejectUnlockRequestDto, userId: string): Promise<UnlockRequest> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Rejecting unlock request',
        data: { userId, ...rejectUnlockRequestDto },
      });

      let payload: UnlockRequestApprovalPayload;
      try {
        payload = await this.tokenService.verifyApprovalToken(rejectUnlockRequestDto.token);
      } catch (error) {
        throw new UnauthorizedException('Invalid or expired approval token');
      }

      if (payload.buddy_user_id !== userId) {
        throw new UnauthorizedException('This request is not for your account');
      }

      const unlockRequest = await this.unlockRequestRepository.findById(payload.unlock_request_id);

      if (!unlockRequest) {
        throw new NotFoundException('Unlock request not found');
      }

      if (unlockRequest.status !== UnlockRequestStatus.PENDING) {
        throw new BadRequestException(`Unlock request is already ${unlockRequest.status}`);
      }

      unlockRequest.status = UnlockRequestStatus.REJECTED;

      const updatedRequest = await this.unlockRequestRepository.update(unlockRequest.id, unlockRequest);

      const requesterUser = await this.userRepository.orm.findOneBy({ id: payload.user_id });
      const requesterLang = requesterUser?.language || 'en';

      const rejectedTitle = this.i18nService.t('common.accountability_buddy_unlock_rejected_title', {
        lang: requesterLang,
      });
      const rejectedDescription = this.i18nService.t('common.accountability_buddy_unlock_rejected_description', {
        lang: requesterLang,
      });

      try {
        await this.notificationService.createUnlockRequestRejectedNotification(
          payload.user_id,
          unlockRequest.id,
          rejectedTitle,
          rejectedDescription,
        );
      } catch (notificationError) {
        // Log notification failure but don't fail the operation
        this.sentryService.instance().captureException(notificationError, {
          level: 'warning',
          tags: { operation: 'reject_unlock_request_notification' },
        });
      }

      return updatedRequest;
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async getUnlockRequests(userId: string, query: GetUnlockRequestsQueryDto): Promise<PaginationDto<UnlockRequest>> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Getting unlock requests',
        data: { userId, ...query },
      });

      const filters = {
        status: query.status,
        role: query.role,
        created_from: query.created_from,
        created_to: query.created_to,
      };

      // Find relationships where the user is the buddy (where buddy_user_id = userId)
      const relationships = await this.accountabilityBuddyRepository.findByBuddyUserId(
        userId,
        InvitationStatus.ACCEPTED,
      );

      const relationshipIds = relationships.map((r) => r.id);

      const [allRequests, totalCount] = await this.unlockRequestRepository.findCombinedUnlockRequests(
        userId,
        relationshipIds,
        filters,
        {
          skip: query.skip || 0,
          take: query.take || 10,
          order: query.order || PageOrder.DESC,
        },
      );

      const meta = new PaginationMetaDto({
        paginationOptionsDto: {
          page: query.page || 1,
          take: query.take || 10,
          order: query.order || PageOrder.DESC,
          skip: query.skip || 0,
        },
        itemCount: totalCount,
      });

      return new PaginationDto(allRequests, meta);
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async approveUnlockRequest(
    approveUnlockRequestParamDto: ApproveUnlockRequestParamDto,
    userId: string,
  ): Promise<UnlockRequest> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Approving unlock request by ID',
        data: { userId, ...approveUnlockRequestParamDto },
      });

      const unlockRequest = await this.unlockRequestRepository.findByIdWithRelations(approveUnlockRequestParamDto.id);

      if (!unlockRequest) {
        throw new NotFoundException('Unlock request not found');
      }

      if (unlockRequest.accountability_buddy?.buddy_user_id !== userId) {
        throw new UnauthorizedException('You are not authorized to approve this unlock request');
      }

      if (unlockRequest.status !== UnlockRequestStatus.PENDING) {
        throw new BadRequestException(`Unlock request is already ${unlockRequest.status}`);
      }

      unlockRequest.status = UnlockRequestStatus.APPROVED;
      unlockRequest.approved_at = new Date();

      const updatedRequest = await this.unlockRequestRepository.update(unlockRequest.id, unlockRequest);

      const requesterUser = await this.validateUser(unlockRequest.user_id);
      const requesterAuth0 = await this.auth0ManagementService.getAuth0User(requesterUser.auth0_id);
      const requesterLang = requesterUser.language || 'en';

      const approvedTitle = this.i18nService.t('common.accountability_buddy_unlock_approved_title', {
        lang: requesterLang,
      });

      try {
        await Promise.all([
          this.emailService.sendUnlockRequestApprovedEmail(requesterAuth0.email),
          this.notificationService.createUnlockRequestApprovedNotification(
            unlockRequest.user_id,
            unlockRequest.id,
            approvedTitle,
          ),
        ]);
      } catch (notificationError) {
        // Log notification/email failure but don't fail the operation
        this.sentryService.instance().captureException(notificationError, {
          level: 'warning',
          tags: { operation: 'approve_unlock_request_notification' },
        });
      }

      return updatedRequest;
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  private async validateUser(userId: string): Promise<User> {
    const user = await this.userRepository.orm.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException(`User with ID: ${userId} does not exist`);
    }
    return user;
  }

  private async validateUnlockRequestCreation(userId: string, buddyUserId: string): Promise<AccountabilityBuddy> {
    const accountabilityBuddy = await this.accountabilityBuddyRepository.findUserBuddy(userId, buddyUserId);

    if (!accountabilityBuddy) {
      throw new NotFoundException('Accountability buddy relationship not found');
    }

    if (accountabilityBuddy.invitation_status !== InvitationStatus.ACCEPTED) {
      throw new BadRequestException('Accountability buddy invitation must be accepted first');
    }

    if (!accountabilityBuddy.buddy_user_id) {
      throw new BadRequestException('Buddy user ID is missing');
    }

    const recentRequest = await this.unlockRequestRepository.findMostRecentByUserId(userId);

    if (recentRequest) {
      const hoursSinceLastRequest = (Date.now() - new Date(recentRequest.created_at).getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastRequest < ACCOUNTABILITY_BUDDY.UNLOCK_REQUEST_COOLDOWN_HOURS) {
        const remainingMinutes = Math.ceil(
          (ACCOUNTABILITY_BUDDY.UNLOCK_REQUEST_COOLDOWN_HOURS - hoursSinceLastRequest) * 60,
        );
        throw new BadRequestException(
          `Please wait ${remainingMinutes} more minutes before creating another unlock request`,
        );
      }
    }

    return accountabilityBuddy;
  }
}
