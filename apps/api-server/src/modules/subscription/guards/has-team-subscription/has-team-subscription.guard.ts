import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { StripeService } from '@app/stripe';
import { TeamManagementService } from '../../../team/services/team-management/team-management.service';
import { PaymentType } from '../../../team/domain/payment-type.enum';
import { SubscriptionStatus } from '../../domain/subscription-status.enum';

@Injectable()
export class HasTeamSubscription implements CanActivate {
  constructor(
    private readonly teamManagementService: TeamManagementService,
    private readonly stripeService: StripeService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const request = ctx.switchToHttp().getRequest();
    const { team_id } = request.body;
    let isAllowed = true;
    let message = '';
    let statusCode = HttpStatus.BAD_REQUEST;
    let status = HttpStatus.BAD_REQUEST;
    const team = await this.teamManagementService.getTeamById(team_id);
    if (team?.payment_type === PaymentType.STRIPE && team.stripe_data) {
      isAllowed = false;
      const { subscriptionId } = team.stripe_data;
      if (!subscriptionId) {
        message = `No subscription ID found for the team with team_id: ${team_id}`;
      } else {
        const subscription = await this.stripeService.subscriptions.retrieve(subscriptionId);
        if (!subscription) {
          message = `Team with team_id: ${team_id} subscription not found`;
        } else if (subscription.status !== SubscriptionStatus.active) {
          message = 'The team does not have an active subscription!';
          statusCode = HttpStatus.PAYMENT_REQUIRED;
          status = HttpStatus.PAYMENT_REQUIRED;
        } else {
          isAllowed = true;
        }
      }

      if (!isAllowed) {
        throw new HttpException({ statusCode, message }, status);
      }
    }

    return isAllowed;
  }
}
