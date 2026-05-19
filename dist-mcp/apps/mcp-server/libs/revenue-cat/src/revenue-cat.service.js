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
exports.RevenueCatService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("axios");
const luxon_1 = require("luxon");
const constants_1 = require("../../../apps/api-server/src/shared/utils/constants");
const entitlement_enum_1 = require("../../../apps/api-server/src/modules/subscription/domain/entitlement.enum");
const subscription_status_model_1 = require("../../../apps/api-server/src/modules/subscription/domain/subscription-status.model");
const revenue_cat_constants_1 = require("./revenue-cat.constants");
let RevenueCatService = class RevenueCatService {
    constructor(options) {
        this.options = options;
        this.httpService = axios_1.default.create({
            baseURL: 'https://api.revenuecat.com/v1/',
            headers: {
                Authorization: `Bearer ${this.options.secretApiKey}`,
                'Content-Type': 'application/json',
                accept: 'application/json',
            },
        });
    }
    async getOrCreateSubscriber(app_user_id) {
        const callUrl = `subscribers/${app_user_id}`;
        const Authorization = `Bearer ${this.options.publicApiKey}`;
        const headers = { Authorization };
        const response = await this.httpService.get(callUrl, { headers });
        if (response.status === 400 || response.status === 401) {
            throw new common_1.BadRequestException(response);
        }
        return Object.assign({}, response.data.subscriber);
    }
    async grantTrialAccess(app_user_id) {
        await this.getOrCreateSubscriber(app_user_id);
        const trialAccess = entitlement_enum_1.Entitlement.trial;
        const duration = 'weekly';
        const callUrl = `subscribers/${app_user_id}/entitlements/${trialAccess}/promotional`;
        const response = await this.httpService.post(callUrl, { duration });
        if (response.status !== 201) {
            throw new common_1.BadRequestException(response);
        }
        const revenueCatCustomer = Object.assign({}, response.data.subscriber);
        return revenueCatCustomer;
    }
    async grantTeamMembership(app_user_id, entitlement, expiresAt) {
        await this.getOrCreateSubscriber(app_user_id);
        const end_time_ms = expiresAt.getTime();
        const callUrl = `subscribers/${app_user_id}/entitlements/${entitlement}/promotional`;
        return this.httpService.post(callUrl, { end_time_ms }).then(({ data }) => data);
    }
    checkSubscriptionStatus({ entitlements }) {
        const entitlementsEntries = Object.entries(entitlements);
        const hasNoEntitlements = entitlementsEntries.length < 1;
        if (hasNoEntitlements)
            return new subscription_status_model_1.SubscriptionStatus();
        const activeEntitlementsEntries = entitlementsEntries.filter(this.validateEntitlement);
        const activeEntitlements = Object.keys(Object.fromEntries(activeEntitlementsEntries));
        const expirations = Object.fromEntries(activeEntitlementsEntries.map((e) => this.getExpirations(e)));
        return new subscription_status_model_1.SubscriptionStatus({ activeEntitlements, expirations });
    }
    getTrialSubscription() {
        const activeEntitlements = [entitlement_enum_1.Entitlement.trial];
        const currentDate = luxon_1.DateTime.local();
        const expirations = {
            trial: {
                expires_date: currentDate.plus({ days: constants_1.TRIAL_DURATION_DAYS }).toISO(),
                purchase_date: currentDate.toISO(),
                days_left: constants_1.TRIAL_DURATION_DAYS,
            },
        };
        return new subscription_status_model_1.SubscriptionStatus({ activeEntitlements, expirations });
    }
    getExpirations([key, { expires_date, purchase_date }]) {
        const now = Date.now();
        const endDate = new Date(expires_date).getTime();
        const days_left = Math.ceil((endDate - now) / (24 * 60 * 60 * 1000));
        return [key, { expires_date, purchase_date, days_left }];
    }
    validateEntitlement([, { expires_date }]) {
        const now = new Date();
        const endDate = new Date(expires_date);
        const isEntitlementValid = endDate > now;
        return isEntitlementValid;
    }
    async revokeTeamMembership(app_user_id, entitlement) {
        const callUrl = `subscribers/${app_user_id}/entitlements/${entitlement}/revoke_promotionals`;
        return this.httpService
            .post(callUrl)
            .then(({ data }) => data)
            .catch((e) => console.error(e === null || e === void 0 ? void 0 : e.response));
    }
    async createPurchase(provider, { app_user_id, fetch_token }) {
        const callUrl = 'https://api.revenuecat.com/v1/receipts';
        const Authorization = `Bearer ${this.options.publicApiKey}`;
        const headers = { Authorization };
        headers['X-Platform'] = provider;
        const body = { app_user_id, fetch_token };
        return this.httpService
            .post(callUrl, body, { headers })
            .then(({ data }) => data)
            .catch((err) => {
            throw new common_1.BadRequestException(err);
        });
    }
    async deleteUserFromRevenueCat(app_user_id) {
        const callUrl = `subscribers/${app_user_id}`;
        await this.httpService.delete(callUrl);
    }
    async getSubscriberFromRevenueCat(app_user_id) {
        const callUrl = `subscribers/${app_user_id}`;
        return this.httpService.get(callUrl).then(({ data }) => data);
    }
    async updateEntitlementExpiry(app_user_id, entitlement, expiresAt) {
        await this.getOrCreateSubscriber(app_user_id);
        const callUrl = `subscribers/${app_user_id}/entitlements/${entitlement}/promotional`;
        const end_time_ms = expiresAt.getTime();
        return this.httpService.post(callUrl, { end_time_ms }).then(({ data }) => data);
    }
};
exports.RevenueCatService = RevenueCatService;
exports.RevenueCatService = RevenueCatService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(revenue_cat_constants_1.REVENUE_CAT_MODULE_OPTIONS)),
    __metadata("design:paramtypes", [Object])
], RevenueCatService);
//# sourceMappingURL=revenue-cat.service.js.map