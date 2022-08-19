import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AuthContext } from '../../../../shared/decorators/passport.decorator';
import { StripeService } from '../../../../../../../libs/stripe/src';
import { Passport } from '../../../auth/domain/passport.model';
import { CreateStripeCheckoutSessionDto } from '../../dto/create-stripe-checkout-session.dto';
import { IsAuth } from '../../../auth/guards/is-auth/is-auth.guard';

@Controller('subscription/stripe')
@UseGuards(IsAuth)
@ApiTags('subscription/stripe')
@ApiSecurity('Auth0AccessToken')
export class StripeController {
  constructor(private readonly stripeService: StripeService) {}

  @Post('create-checkout-session')
  async createCheckoutSession(@Body() { price_id }: CreateStripeCheckoutSessionDto, @AuthContext() { user }: Passport) {
    const session = await this.stripeService.createCheckoutSession(price_id, user.stripeCustomerId);
    return { url: session.url };
  }

  @Post('create-portal-session')
  async createPortalSession(@AuthContext() { user }: Passport) {
    const session = await this.stripeService.createPortalSession(user.stripeCustomerId);
    return { url: session.url };
  }
}
