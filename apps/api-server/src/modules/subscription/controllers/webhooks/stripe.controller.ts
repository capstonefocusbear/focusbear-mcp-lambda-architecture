import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import Stripe from 'stripe';
import { StripeService } from '@app/stripe';
import { AuthContext } from '../../../../shared/decorators/passport.decorator';
import { Passport } from '../../../auth/domain/passport.model';
import { CreateStripeCheckoutSessionDto } from '../../dto/create-stripe-checkout-session.dto';
import { IsAuth } from '../../../auth/guards/is-auth/is-auth.guard';
import { GetStripeProductsDto } from '../../dto/get-stripe-products.dto';
import { GetStripePricesDto } from '../../dto/get-stripe-prices.dto';

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

  @Get('products')
  async getProductsList(@Query() params: GetStripeProductsDto): Promise<Stripe.ApiListPromise<Stripe.Product>> {
    return this.stripeService.getProductsList(params);
  }

  @Get('prices')
  async getPrices(@Query() params: GetStripePricesDto): Promise<Stripe.ApiListPromise<Stripe.Price>> {
    return this.stripeService.getProductPrices(params);
  }

  @Get('prices/:price_id')
  async getPriceDetails(@Param('price_id') price_id: string): Promise<Stripe.Response<Stripe.Price>> {
    return this.stripeService.getPriceDetails(price_id);
  }
}
