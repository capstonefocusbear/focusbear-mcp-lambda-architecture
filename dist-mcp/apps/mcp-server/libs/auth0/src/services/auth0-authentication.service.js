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
exports.Auth0AuthenticationService = void 0;
const common_1 = require("@nestjs/common");
const jwksClient = require("jwks-rsa");
const jwt = require("jsonwebtoken");
const auth0_1 = require("auth0");
const auth0_constants_1 = require("../auth0.constants");
let Auth0AuthenticationService = class Auth0AuthenticationService extends auth0_1.AuthenticationClient {
    constructor(Auth0Options) {
        super(Object.assign({}, Auth0Options));
        this.Auth0Options = Auth0Options;
        this.SERVICE_ACCOUNT_AUDIENCE = 'https://focusbear.io/team-management';
        this.jwksClient = jwksClient({
            jwksUri: `https://${this.Auth0Options.domain}/.well-known/jwks.json`,
            cache: true,
            rateLimit: true,
            jwksRequestsPerMinute: 10,
        });
    }
    async validateAccessToken(token) {
        return this.validateToken(token, [this.Auth0Options.identifier]);
    }
    async validateServiceAccountToken(token) {
        return this.validateToken(token, [this.SERVICE_ACCOUNT_AUDIENCE]);
    }
    async validateToken(token, allowedAudiences) {
        try {
            const decoded = jwt.decode(token, { complete: true });
            if (!decoded)
                return [false, { declineReason: 'Token missing or corrupted!' }];
            const { header, payload } = decoded;
            const tokenAudience = payload === null || payload === void 0 ? void 0 : payload.aud;
            const hasValidAudience = this.hasValidAudience(tokenAudience, allowedAudiences);
            if (!hasValidAudience) {
                return [
                    false,
                    { declineReason: `Token audience not allowed. Expected one of: ${allowedAudiences.join(', ')}` },
                ];
            }
            const signingKey = await this.jwksClient.getSigningKey(header === null || header === void 0 ? void 0 : header.kid);
            const publicKey = signingKey.getPublicKey();
            const validToken = await jwt.verify(token, publicKey);
            const isValid = Boolean(validToken);
            return [isValid, { payload }];
        }
        catch ({ message }) {
            return [false, { declineReason: message }];
        }
    }
    hasValidAudience(tokenAudience, allowedAudiences) {
        if (!tokenAudience)
            return false;
        if (Array.isArray(tokenAudience)) {
            return tokenAudience.some((aud) => allowedAudiences.includes(aud));
        }
        return allowedAudiences.includes(tokenAudience);
    }
};
exports.Auth0AuthenticationService = Auth0AuthenticationService;
exports.Auth0AuthenticationService = Auth0AuthenticationService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(auth0_constants_1.AUTH0_MODULE_OPTIONS)),
    __metadata("design:paramtypes", [Object])
], Auth0AuthenticationService);
//# sourceMappingURL=auth0-authentication.service.js.map