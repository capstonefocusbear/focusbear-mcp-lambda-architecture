"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripeService = void 0;
const common_1 = require("@nestjs/common");
const stripe_1 = require("stripe");
const nestjs_1 = require("@sentry/nestjs");
const observability_1 = require("../../observability/src");
const axios_1 = require("axios");
const revenue_cat_1 = require("../../revenue-cat/src");
const auth0_management_service_1 = require("../../auth0/src/services/auth0-management.service");
const bull_1 = require("@nestjs/bull");
const user_repository_1 = require("../../../apps/api-server/src/modules/user/repositories/user.repository");
const create_stripe_checkout_session_dto_1 = require("../../../apps/api-server/src/modules/subscription/dto/create-stripe-checkout-session.dto");
const constants_1 = require("../../../apps/api-server/src/shared/utils/constants");
const stripe_constants_1 = require("./stripe.constants");
const helpers_1 = require("../../../apps/api-server/src/shared/utils/helpers");
const feedback_entity_1 = require("./entities/feedback.entity");
const ormconfig_1 = require("../../../apps/api-server/ormconfig");
let StripeService = class StripeService extends stripe_1.default {
    constructor(options, emailQueue, sentryService, revenueCatService, userRepository, auth0ManagementService) {
        super(options.secretKey, { apiVersion: constants_1.STRIPE_API_VERSION });
        this.options = options;
        this.emailQueue = emailQueue;
        this.sentryService = sentryService;
        this.revenueCatService = revenueCatService;
        this.userRepository = userRepository;
        this.auth0ManagementService = auth0ManagementService;
        this.ormFeedback = ormconfig_1.AppDataSource.getRepository(feedback_entity_1.Feedback);
    }
    async createCheckoutSession(customer, { price_id, team_id, team_size = 1, team_name }) {
        const { success_url, cancel_url } = this.options.checkout;
        return this.checkout.sessions
            .create({
            success_url,
            cancel_url,
            allow_promotion_codes: true,
            customer,
            automatic_tax: { enabled: true },
            customer_update: { address: 'auto' },
            billing_address_collection: 'auto',
            line_items: [
                {
                    price: price_id,
                    quantity: team_size,
                },
            ],
            mode: 'subscription',
            subscription_data: { metadata: { team_id, team_name } },
        })
            .catch((err) => {
            throw new common_1.BadRequestException(err.message);
        });
    }
    async updateSubscription(subId, subItemId, quantity) {
        const subscription = await this.subscriptions.update(subId, {
            items: [
                {
                    id: subItemId,
                    quantity,
                },
            ],
        });
        return subscription;
    }
    async createPortalSession(customer) {
        return this.billingPortal.sessions
            .create({
            customer,
            return_url: this.options.checkout.success_url,
        })
            .catch((err) => {
            throw new common_1.BadRequestException(err.message);
        });
    }
    async registerNewCustomer(email, platform, options) {
        var _a, _b;
        return this.customers.create({
            email,
            metadata: Object.assign({ is_internal_user: String((_a = email === null || email === void 0 ? void 0 : email.includes('focusbear.io')) !== null && _a !== void 0 ? _a : false), platform }, ((_b = options === null || options === void 0 ? void 0 : options.metadata) !== null && _b !== void 0 ? _b : {})),
        }, (options === null || options === void 0 ? void 0 : options.idempotencyKey) ? { idempotencyKey: options.idempotencyKey } : undefined);
    }
    async decodeWebhookEvent(payload, headers) {
        const signature = headers['stripe-signature'];
        const webhookSecret = this.options.webhook.secret;
        const event = await this.webhooks.constructEventAsync(payload, signature, webhookSecret);
        return event;
    }
    async getProductsList({ ending_before, starting_after, limit = 10, active = true, }) {
        return this.products
            .list({
            active,
            limit,
            ending_before,
            starting_after,
        })
            .catch((err) => {
            throw new common_1.BadRequestException(err.message);
        });
    }
    async getProductPrices({ product, currency, ending_before, limit, lookup_keys, starting_after, active = true, }) {
        return this.prices
            .list({
            product,
            currency,
            ending_before,
            limit,
            lookup_keys,
            starting_after,
            active,
        })
            .catch((err) => {
            throw new common_1.BadRequestException(err.message);
        });
    }
    async getPriceDetails(price_id) {
        return this.prices.retrieve(price_id).catch((err) => {
            throw new common_1.BadRequestException(err.message);
        });
    }
    async deleteStripeCustomer(stripeCustomerId) {
        await this.customers.del(stripeCustomerId);
    }
    async getStripeCustomerId(email) {
        const { data: users } = await this.customers.list({ email });
        if (users.length < 1) {
            return null;
        }
        return users[0].id;
    }
    async getCustomerSubscriptionRate(stripeCustomerId) {
        var _a, _b, _c;
        const stripeUser = await this.customers.retrieve(stripeCustomerId, { expand: ['subscriptions'] });
        const invoiceId = (_c = (_b = (_a = stripeUser.subscriptions) === null || _a === void 0 ? void 0 : _a.data[0]) === null || _b === void 0 ? void 0 : _b.latest_invoice) !== null && _c !== void 0 ? _c : null;
        if (!invoiceId)
            return 0;
        const userInvoices = await this.invoices.list({ customer: stripeCustomerId });
        return (0, helpers_1.findNonZeroTotal)(userInvoices.data);
    }
    async cancelSubscription(subscriptionId) {
        return this.subscriptions.del(subscriptionId);
    }
    async logCancellation(cancelSubscriptionSessionDto, user_id, email) {
        if (email) {
            await this.emailQueue.add('sendEmail', {
                to: constants_1.FOCUS_BEAR_EMAILS.ZOHO_DESK_SUPPORT,
                from: constants_1.FOCUS_BEAR_EMAILS.SUPPORT,
                replyTo: email,
                subject: `${constants_1.EMAIL_SUBJECTS.USER_UNSUBSCRIBE_FEEDBACK}: ${cancelSubscriptionSessionDto.cancel_subscription_reason}`,
                text: `User ID: ${user_id}\n\n${(0, helpers_1.prettyJson)(cancelSubscriptionSessionDto)}`,
            });
        }
        const cliqUrl = `${process.env.ZOHO_CLIQ_BACKEND_BOT_WEBHOOK}?zapikey=${process.env.ZOHO_CLIQ_API_KEY}`;
        const body = {
            channel: process.env.ZOHO_CLIQ_CUSTOMER_FEEDBACK_CHANNEL,
            message: `Subscription canceled\n\n User:${user_id} \n\n Reason:${cancelSubscriptionSessionDto.cancel_subscription_reason}`,
        };
        return axios_1.default.post(cliqUrl, body);
    }
    async cancelSubscriptionSession(cancelSubscriptionSessionDto, userAuthContext) {
        try {
            const [userResponse, subscriptionsResponse] = await Promise.allSettled([
                this.userRepository.orm.findOneBy({ id: userAuthContext.id }),
                this.subscriptions.list({ customer: userAuthContext.stripeCustomerId }),
            ]);
            const user = userResponse.value;
            const subscriptions = subscriptionsResponse
                .value;
            if (!user) {
                throw new common_1.NotFoundException(`User with ID: ${userAuthContext.id} does not exist!`);
            }
            if (!subscriptions.data.length) {
                throw new common_1.NotFoundException(`No active subscription found for user ID: ${user.id}`);
            }
            const stripeResponse = await this.cancelSubscription(subscriptions.data[0].id);
            if (stripeResponse.status !== 'canceled') {
                this.sentryService.instance().captureException(stripeResponse, { level: 'warning' });
            }
            const feedback = new feedback_entity_1.Feedback({
                cancel_subscription_reason: cancelSubscriptionSessionDto.cancel_subscription_reason,
                user_id: user.id,
            });
            const [auth0UserPromiseResponse, feedbackPromiseResponse] = await Promise.allSettled([
                this.auth0ManagementService.getAuth0User(user.auth0_id),
                this.ormFeedback.save(feedback),
            ]);
            const auth0User = auth0UserPromiseResponse.value;
            const feedbackResponse = feedbackPromiseResponse.value;
            if (!feedbackResponse) {
                this.sentryService
                    .instance()
                    .captureException('User feedback could not be saved due to missing or invalid response data.', {
                    level: 'warning',
                });
            }
            return await this.logCancellation(cancelSubscriptionSessionDto, user.id, auth0User.email);
        }
        catch (error) {
            this.sentryService.instance().captureException(error, { level: 'error' });
            throw error;
        }
    }
};
exports.StripeService = StripeService;
__decorate([
    (0, nestjs_1.SentryTraced)('createCheckoutSession'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_stripe_checkout_session_dto_1.CreateStripeCheckoutSessionDto]),
    __metadata("design:returntype", Promise)
], StripeService.prototype, "createCheckoutSession", null);
__decorate([
    (0, nestjs_1.SentryTraced)('updateSubscription'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Number]),
    __metadata("design:returntype", Promise)
], StripeService.prototype, "updateSubscription", null);
exports.StripeService = StripeService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(stripe_constants_1.STRIPE_MODULE_OPTIONS)),
    __param(1, (0, bull_1.InjectQueue)('emailQueue')),
    __param(2, (0, observability_1.InjectSentry)()),
    __metadata("design:paramtypes", [Object, Object, observability_1.SentryService,
        revenue_cat_1.RevenueCatService,
        user_repository_1.UserRepository,
        auth0_management_service_1.Auth0ManagementService])
], StripeService);
//# sourceMappingURL=stripe.service.js.map