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
exports.Auth0ManagementService = void 0;
const common_1 = require("@nestjs/common");
const auth0_1 = require("auth0");
const ioredis_1 = require("ioredis");
const auth0_constants_1 = require("../auth0.constants");
const helpers_1 = require("../../../../apps/api-server/src/shared/utils/helpers");
const AUTH0_USER_CACHE_TTL_SECONDS = 3600;
const AUTH0_USERS_BY_EMAIL_CACHE_TTL_SECONDS = 1800;
const getAuth0UserCacheKey = (auth0Id) => `auth0:user:${auth0Id}`;
const getAuth0UsersByEmailCacheKey = (email) => `auth0:users:email:${email}`;
let Auth0ManagementService = class Auth0ManagementService extends auth0_1.ManagementClient {
    constructor(options) {
        super({ domain: options.domain, clientId: options.clientId, clientSecret: options.clientSecret });
        this.options = options;
        this.logger = new common_1.Logger('Auth0ManagementService');
        this.validateRedisEnvironment();
        this.redisClient = new ioredis_1.default(`redis://${process.env.REDIS_HOSTNAME}:${process.env.REDIS_PORT}`);
    }
    validateRedisEnvironment() {
        if (!process.env.REDIS_HOSTNAME) {
            throw new Error('REDIS_HOSTNAME environment variable is required but not set');
        }
        if (!process.env.REDIS_PORT) {
            throw new Error('REDIS_PORT environment variable is required but not set');
        }
    }
    async getCachedUser(auth0Id) {
        try {
            const cacheKey = getAuth0UserCacheKey(auth0Id);
            const encryptedData = await this.redisClient.get(cacheKey);
            if (!encryptedData)
                return null;
            const decryptedData = helpers_1.FieldTransformer.from(encryptedData);
            return JSON.parse(decryptedData);
        }
        catch (error) {
            console.error('Failed to get cached user:', error);
            return null;
        }
    }
    async setCachedUser(auth0Id, userData) {
        try {
            const cacheKey = getAuth0UserCacheKey(auth0Id);
            const jsonData = JSON.stringify(userData);
            const encryptedData = helpers_1.FieldTransformer.to(jsonData);
            await this.redisClient.setex(cacheKey, AUTH0_USER_CACHE_TTL_SECONDS, encryptedData);
        }
        catch (error) {
            console.error('Failed to cache user:', error);
        }
    }
    async getAuth0User(auth0Id) {
        try {
            const cachedUser = await (0, helpers_1.callPromiseWithTimeout)(this.getCachedUser(auth0Id), 300).catch(() => null);
            if (cachedUser) {
                return cachedUser;
            }
            const { data: user } = await (0, helpers_1.callPromiseWithTimeout)(this.users.get({ id: auth0Id }), 4000);
            if (user) {
                await this.setCachedUser(auth0Id, user);
            }
            return user;
        }
        catch (error) {
            if (error.message.includes('does not exist')) {
                return null;
            }
            throw new Error(`Error fetching user with Auth0 ID ${auth0Id}: ${error}`);
        }
    }
    async resendEmailVerification(auth0Id) {
        return this.jobs.verifyEmail({ user_id: auth0Id });
    }
    async getAuth0UsersWithEmail(email) {
        try {
            const cacheKey = getAuth0UsersByEmailCacheKey(email);
            const encryptedData = await this.redisClient.get(cacheKey);
            if (encryptedData) {
                const decryptedData = helpers_1.FieldTransformer.from(encryptedData);
                return JSON.parse(decryptedData);
            }
            const { data: usersMatchingEmail } = await this.users.getAll({ q: `email:"${email}"` });
            if (usersMatchingEmail) {
                const jsonData = JSON.stringify(usersMatchingEmail);
                const encryptedUserData = helpers_1.FieldTransformer.to(jsonData);
                await this.redisClient.setex(cacheKey, AUTH0_USERS_BY_EMAIL_CACHE_TTL_SECONDS, encryptedUserData);
            }
            return usersMatchingEmail;
        }
        catch (error) {
            console.error('Failed to get users with email:', error);
            const { data: usersMatchingEmail } = await this.users.getAll({ q: `email:"${email}"` });
            return usersMatchingEmail;
        }
    }
    async deleteAuth0User(auth0Id) {
        await this.users.delete({ id: auth0Id });
    }
    async getDeviceCredentials(auth0Id) {
        try {
            const response = await this.deviceCredentials.getAll({ user_id: auth0Id });
            return response.data;
        }
        catch (error) {
            console.error('Failed to fetch device credentials: ', error);
            return [];
        }
    }
    async markUserEmailAsVerified(auth0Id, email) {
        var _a;
        try {
            const result = await this.users.update({ id: auth0Id }, { email_verified: true });
            try {
                const cacheKeysToDelete = [getAuth0UserCacheKey(auth0Id)];
                if (email) {
                    cacheKeysToDelete.push(getAuth0UsersByEmailCacheKey(email));
                }
                await this.redisClient.del(...cacheKeysToDelete);
            }
            catch (cacheError) {
                this.logger.warn(`Failed to invalidate Auth0 user cache for ${auth0Id}: ${(_a = cacheError === null || cacheError === void 0 ? void 0 : cacheError.message) !== null && _a !== void 0 ? _a : cacheError}`);
            }
            return result;
        }
        catch (_b) {
            throw new common_1.HttpException('Failed to verify email in Auth0', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async updatePassword(auth0Id, newPassword) {
        try {
            return await this.users.update({ id: auth0Id }, {
                password: newPassword,
                connection: 'Username-Password-Authentication',
            });
        }
        catch (_a) {
            throw new common_1.HttpException('Failed to update password in Auth0', common_1.HttpStatus.BAD_REQUEST);
        }
    }
};
exports.Auth0ManagementService = Auth0ManagementService;
exports.Auth0ManagementService = Auth0ManagementService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(auth0_constants_1.AUTH0_MODULE_OPTIONS)),
    __metadata("design:paramtypes", [Object])
], Auth0ManagementService);
//# sourceMappingURL=auth0-management.service.js.map